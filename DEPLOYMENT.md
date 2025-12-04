# Render Deployment Guide for Evantra

## Prerequisites
- GitHub repository with your code
- MySQL database (use a free service like FreeSQLDatabase.com or Render's paid MySQL)

## Step-by-Step Deployment

### 1. Set Up MySQL Database
Since Render doesn't offer free MySQL, use one of these options:

**Option A: FreeSQLDatabase.com (Free)**
1. Go to https://www.freesqldatabase.com/
2. Sign up and create a free MySQL database
3. Note down: Host, Database Name, Username, Password, Port

**Option B: PlanetScale (Free)**
1. Go to https://planetscale.com/
2. Create a free database
3. Get connection credentials

### 2. Deploy to Render

1. **Create Render Account**
   - Go to https://render.com
   - Sign up with GitHub

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository: `evantra-event-management-`
   - Click "Connect"

3. **Configure Service**
   - **Name**: `evantra`
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: (leave blank)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

4. **Add Environment Variables**
   Click "Advanced" → Add these environment variables:
   ```
   DB_HOST=<your_mysql_host>
   DB_USER=<your_mysql_username>
   DB_PASSWORD=<your_mysql_password>
   DB_NAME=event_db
   SESSION_SECRET=your_random_secret_key_here
   NODE_ENV=production
   ```

5. **Create Web Service**
   - Click "Create Web Service"
   - Render will automatically build and deploy!

### 3. Set Up Database Schema

Once deployed, you need to run your SQL schema on the remote database:

**Using MySQL Workbench or phpMyAdmin:**
1. Connect to your remote MySQL database
2. Run the SQL files in this order:
   - `schema.sql`
   - `event_submissions_schema.sql`
   - `reviews_schema.sql`
   - `setup_password_reset.sql`

3. Create an admin user:
   ```sql
   INSERT INTO users (name, email, password, role) 
   VALUES ('Admin', 'admin@evantra.com', '<bcrypt_hashed_password>', 'admin');
   ```

### 4. Access Your App
Your app will be live at: `https://evantra.onrender.com`

## Important Notes

- ⚠️ Free tier on Render spins down after 15 minutes of inactivity
- First request after idle may take 30-60 seconds
- For production, consider upgrading to paid tier for better performance
- Database must be hosted separately (not on Render free tier)

## Troubleshooting

**If deployment fails:**
1. Check build logs in Render dashboard
2. Verify all environment variables are set correctly
3. Ensure database is accessible from Render's servers

**If database connection fails:**
1. Verify DB credentials in environment variables
2. Check if database allows external connections
3. Whitelist Render's IP addresses if needed
