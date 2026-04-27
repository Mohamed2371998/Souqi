-- Saudi-market E-commerce schema (MySQL 8+)
-- Charset/collation selected for full Arabic support.

CREATE DATABASE IF NOT EXISTS souqi_store
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE souqi_store;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- Drop existing tables in dependency order (safe for reseeding in development)
DROP TABLE IF EXISTS order_payments;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS cart;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS promo_codes;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS saudi_cities;

CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(30) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'customer') NOT NULL DEFAULT 'customer',
  preferred_lang ENUM('ar', 'en') NOT NULL DEFAULT 'ar',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_created_at (created_at)
) ENGINE=InnoDB;

CREATE TABLE categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name_ar VARCHAR(120) NOT NULL,
  name_en VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL UNIQUE,
  description_ar TEXT,
  description_en TEXT,
  image_url VARCHAR(500),
  INDEX idx_categories_slug (slug)
) ENGINE=InnoDB;

CREATE TABLE products (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id BIGINT UNSIGNED NOT NULL,
  name_ar VARCHAR(200) NOT NULL,
  name_en VARCHAR(200) NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  price_sar DECIMAL(10,2) NOT NULL CHECK (price_sar >= 0),
  stock_qty INT NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  image_url VARCHAR(500),
  brand VARCHAR(120),
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  vat_included BOOLEAN NOT NULL DEFAULT TRUE,
  installment_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_products_category (category_id),
  INDEX idx_products_price (price_sar),
  INDEX idx_products_featured (is_featured),
  INDEX idx_products_installment (installment_eligible),
  FULLTEXT INDEX ftx_products_name_desc (name_ar, name_en, description_ar, description_en)
) ENGINE=InnoDB;

CREATE TABLE orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  total_price_sar DECIMAL(10,2) NOT NULL CHECK (total_price_sar >= 0),
  vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
  payment_method ENUM('mada', 'visa', 'mastercard', 'stc_pay', 'apple_pay', 'tamara', 'tabby', 'cod') NOT NULL,
  payment_status ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  order_status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending',
  shipping_address_json JSON NOT NULL,
  tamara_order_id VARCHAR(190),
  tabby_payment_id VARCHAR(190),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_orders_user (user_id),
  INDEX idx_orders_payment_status (payment_status),
  INDEX idx_orders_order_status (order_status),
  INDEX idx_orders_created_at (created_at)
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price_sar DECIMAL(10,2) NOT NULL CHECK (unit_price_sar >= 0),
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_order_items_order (order_id),
  INDEX idx_order_items_product (product_id)
) ENGINE=InnoDB;

CREATE TABLE cart (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  CONSTRAINT fk_cart_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_cart_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  UNIQUE KEY uq_cart_user_product (user_id, product_id),
  INDEX idx_cart_user (user_id),
  INDEX idx_cart_product (product_id)
) ENGINE=InnoDB;

CREATE TABLE reviews (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reviews_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_reviews_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  UNIQUE KEY uq_reviews_user_product (user_id, product_id),
  INDEX idx_reviews_product (product_id),
  INDEX idx_reviews_rating (rating)
) ENGINE=InnoDB;

CREATE TABLE promo_codes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(60) NOT NULL UNIQUE,
  discount_type ENUM('percent', 'fixed') NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_sar DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (min_order_sar >= 0),
  expires_at DATETIME,
  usage_limit INT,
  used_count INT NOT NULL DEFAULT 0,
  INDEX idx_promo_code (code),
  INDEX idx_promo_expires_at (expires_at)
) ENGINE=InnoDB;

-- Payment transaction log table required by gateway/Tamara/Tabby flows
CREATE TABLE order_payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  gateway ENUM('moyasar', 'hyperpay', 'tamara', 'tabby', 'stc_pay', 'cod') NOT NULL,
  transaction_id VARCHAR(190) NOT NULL,
  amount_sar DECIMAL(10,2) NOT NULL CHECK (amount_sar >= 0),
  status ENUM('pending', 'authorized', 'captured', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  raw_response_json JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_payments_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  INDEX idx_order_payments_order (order_id),
  INDEX idx_order_payments_txn (transaction_id),
  INDEX idx_order_payments_status (status)
) ENGINE=InnoDB;

-- Saudi city seed data for checkout dropdown / address normalization
CREATE TABLE saudi_cities (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name_ar VARCHAR(120) NOT NULL,
  name_en VARCHAR(120) NOT NULL,
  region_ar VARCHAR(120),
  region_en VARCHAR(120),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_saudi_cities_name_en (name_en),
  INDEX idx_saudi_cities_name_ar (name_ar)
) ENGINE=InnoDB;

INSERT INTO saudi_cities (name_ar, name_en, region_ar, region_en) VALUES
('الرياض', 'Riyadh', 'منطقة الرياض', 'Riyadh Region'),
('جدة', 'Jeddah', 'منطقة مكة المكرمة', 'Makkah Region'),
('الدمام', 'Dammam', 'المنطقة الشرقية', 'Eastern Province'),
('مكة', 'Mecca', 'منطقة مكة المكرمة', 'Makkah Region'),
('المدينة', 'Medina', 'منطقة المدينة المنورة', 'Madinah Region'),
('الخبر', 'Khobar', 'المنطقة الشرقية', 'Eastern Province'),
('تبوك', 'Tabuk', 'منطقة تبوك', 'Tabuk Region');

-- Category seed data (electronics + beauty/personal care)
INSERT INTO categories (name_ar, name_en, slug, description_ar, description_en, image_url) VALUES
('مجففات الشعر', 'Hair Dryers', 'hair-dryers', 'مجففات شعر احترافية وسريعة التجفيف.', 'Professional hair dryers with fast drying performance.', '/uploads/categories/hair-dryers.jpg'),
('مكينة الحلاقة', 'Shavers & Trimmers', 'shavers-trimmers', 'ماكينات حلاقة وتشذيب دقيقة للرجال والنساء.', 'Precision shavers and trimmers for men and women.', '/uploads/categories/shavers-trimmers.jpg'),
('مستقيم الشعر', 'Hair Straighteners', 'hair-straighteners', 'أجهزة فرد وتنعيم الشعر بحرارة موزعة بالتساوي.', 'Hair straighteners with even heat distribution.', '/uploads/categories/hair-straighteners.jpg'),
('فرشاة الأسنان الكهربائية', 'Electric Toothbrushes', 'electric-toothbrushes', 'فرش أسنان كهربائية بعناية متقدمة بالفم.', 'Electric toothbrushes for advanced oral care.', '/uploads/categories/electric-toothbrushes.jpg'),
('شامبو وبلسم', 'Shampoo & Conditioner', 'shampoo-conditioner', 'شامبو وبلسم للعناية اليومية بمختلف أنواع الشعر.', 'Shampoo and conditioner sets for daily hair care.', '/uploads/categories/shampoo-conditioner.jpg'),
('كريمات الوجه', 'Face Creams', 'face-creams', 'كريمات ترطيب وتفتيح ومكافحة علامات التقدم بالعمر.', 'Face creams for hydration, brightening, and anti-aging.', '/uploads/categories/face-creams.jpg'),
('سيروم العناية', 'Serums & Treatments', 'serums-treatments', 'سيرومات مركزة لعلاج مشاكل البشرة المختلفة.', 'Concentrated serums and treatment solutions.', '/uploads/categories/serums-treatments.jpg'),
('لوشن الجسم', 'Body Lotions', 'body-lotions', 'لوشنات مرطبة للبشرة بنعومة تدوم طويلًا.', 'Body lotions for long-lasting skin hydration.', '/uploads/categories/body-lotions.jpg');

-- Sample products with VAT included and BNPL eligibility where relevant
INSERT INTO products (
  category_id, name_ar, name_en, description_ar, description_en,
  price_sar, stock_qty, image_url, brand, is_featured, vat_included, installment_eligible
) VALUES
((SELECT id FROM categories WHERE slug='hair-dryers'), 'مجفف شعر احترافي 2200 واط', 'Pro Hair Dryer 2200W', 'مجفف سريع مع تقنية الأيونات لتقليل الهيشان.', 'Fast dryer with ionic technology to reduce frizz.', 299.00, 40, '/uploads/products/dryer-2200w.jpg', 'Philips', TRUE, TRUE, TRUE),
((SELECT id FROM categories WHERE slug='shavers-trimmers'), 'ماكينة حلاقة لاسلكية 5 في 1', 'Cordless Shaver 5-in-1', 'حلاقة دقيقة مع رؤوس متعددة وسهلة التنظيف.', 'Precision shave with multiple washable heads.', 249.00, 55, '/uploads/products/shaver-5in1.jpg', 'Braun', TRUE, TRUE, TRUE),
((SELECT id FROM categories WHERE slug='hair-straighteners'), 'مستقيم شعر سيراميك احترافي', 'Professional Ceramic Straightener', 'ألواح سيراميك لحماية الشعر وتوزيع حرارة متوازن.', 'Ceramic plates for protection and balanced heat.', 219.00, 60, '/uploads/products/straightener-ceramic.jpg', 'Remington', FALSE, TRUE, TRUE),
((SELECT id FROM categories WHERE slug='electric-toothbrushes'), 'فرشاة أسنان كهربائية ذكية', 'Smart Electric Toothbrush', 'مؤقت ذكي ووضعيات تنظيف متعددة.', 'Smart timer with multiple brushing modes.', 189.00, 80, '/uploads/products/toothbrush-smart.jpg', 'Oral-B', FALSE, TRUE, TRUE),
((SELECT id FROM categories WHERE slug='shampoo-conditioner'), 'مجموعة شامبو وبلسم بالكيراتين', 'Keratin Shampoo & Conditioner Set', 'تركيبة مغذية للشعر الجاف والتالف.', 'Nourishing formula for dry and damaged hair.', 89.00, 120, '/uploads/products/shampoo-keratin.jpg', 'L\'Oréal', TRUE, TRUE, FALSE),
((SELECT id FROM categories WHERE slug='face-creams'), 'كريم وجه مرطب بحمض الهيالورونيك', 'Hydrating Face Cream with Hyaluronic Acid', 'ترطيب عميق يدوم طوال اليوم.', 'Deep hydration that lasts all day.', 139.00, 95, '/uploads/products/face-cream-hyaluronic.jpg', 'Neutrogena', TRUE, TRUE, FALSE),
((SELECT id FROM categories WHERE slug='serums-treatments'), 'سيروم فيتامين C للإشراقة', 'Vitamin C Brightening Serum', 'يساعد على توحيد لون البشرة وتقليل البهتان.', 'Helps even skin tone and reduce dullness.', 159.00, 110, '/uploads/products/serum-vitamin-c.jpg', 'The Ordinary', TRUE, TRUE, FALSE),
((SELECT id FROM categories WHERE slug='body-lotions'), 'لوشن جسم مرطب بزبدة الشيا', 'Shea Butter Body Lotion', 'ترطيب مكثف وامتصاص سريع.', 'Intense hydration with quick absorption.', 79.00, 140, '/uploads/products/body-lotion-shea.jpg', 'Nivea', FALSE, TRUE, FALSE);

-- Optional starter promo codes for testing
INSERT INTO promo_codes (code, discount_type, discount_value, min_order_sar, expires_at, usage_limit, used_count) VALUES
('RAMADAN10', 'percent', 10.00, 150.00, DATE_ADD(NOW(), INTERVAL 60 DAY), 1000, 0),
('WELCOME25', 'fixed', 25.00, 200.00, DATE_ADD(NOW(), INTERVAL 45 DAY), 500, 0);
