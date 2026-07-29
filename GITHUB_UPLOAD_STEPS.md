# GitHub Upload Steps

Create an empty repository called `Souqi` or `souqi-modern-marketplace`, then run:

```bash
git init
git add .
git commit -m "Redesign Souqi marketplace"
git branch -M main
git remote add origin https://github.com/Mohamed2371998/Souqi.git
git push -u origin main
```

For deployment, add environment variables in the hosting dashboard. Never commit `.env` or secret payment keys.
