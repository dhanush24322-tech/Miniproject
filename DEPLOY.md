# 🚀 Deployment Guide — Render Unified Launch

Since we've already configured the **`render.yaml`** and integrated your **Supabase** database, you can deploy both the Frontend and Backend in just a few clicks!

## 🏁 Prerequisites
1.  **GitHub**: Ensure you've followed my previous instructions to `git push` your code to your repository: `https://github.com/dhanush24322-tech/Miniproject.git`.
2.  **Render Account**: Sign up or log in at [render.com](https://render.com).

## 🚀 Deployment Steps

1.  **Click New**: In the Render Dashboard, click the blue **New +** button and select **Blueprint**.
2.  **Connect GitHub**: Select your `Miniproject` repository.
3.  **Approve Name**: Give the blueprint a name (e.g., `dr-detection-cloud`).
4.  **Confirm**: Click **Apply**.

## 🔄 What happens next?
- Render will automatically create **two services**:
    - **`dr-detection-api`**: Your Python AI engine.
    - **`dr-detection-ui`**: Your React Dashboard.
- It will automatically build and link them together using the **Supabase** database credentials we already added.

## ⚠️ Important Note
> [!CAUTION]
> On the **Free Plan** of Render, the backend service "sleeps" if it hasn't been used for a while. The very first time you open the dashboard after a long break, it may take 30–60 seconds to wake up!

Once the status says **Live** in Render, you'll be given a URL (e.g., `https://dr-detection-ui.onrender.com`) to access your app from anywhere! 🌐
