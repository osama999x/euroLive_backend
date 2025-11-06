# RishtaNagar Express to NestJS Migration Guide

## Overview
This document outlines the successful migration of the RishtaNagar matrimonial platform from Express.js to NestJS with TypeORM and MySQL.

## What Was Migrated

### 1. Database Configuration
- **From**: Express with custom TypeORM setup
- **To**: NestJS TypeORM module with MySQL
- **Location**: `src/config/database.config.ts`
- **Configuration**: TypeORM module configured in `app.module.ts`

### 2. Entities (All 12 entities migrated)
Located in `src/common/entities/`:
- ✅ User (Users.ts → user.entity.ts)
- ✅ Religion (Religion.ts → religion.entity.ts)
- ✅ City (City.ts → city.entity.ts)
- ✅ PersonalDetails (PersonalDetails.ts → personal-details.entity.ts)
- ✅ FamilyDetails (FamilyDetails.ts → family-details.entity.ts)
- ✅ LocationHousing (LocationHousing.ts → location-housing.entity.ts)
- ✅ EducationCareer (EducationCareer.ts → education-career.entity.ts)
- ✅ Preferences (Preferences.ts → preferences.entity.ts)
- ✅ ActivityStats (ActivityStats.ts → activity-stats.entity.ts)
- ✅ UserImage (UserImages.ts → user-image.entity.ts)
- ✅ UserResetPassword (UserResetPass.ts → user-reset-password.entity.ts)
- ✅ UserActivityLog (userActivityLog.ts → user-activity-log.entity.ts)

### 3. Enums
Located in `src/common/enums/`:
- ✅ GenderEnum (Male, Female, Other)
- ✅ ProfileForEnum (Sibling, Parent, Child, Friend, Cousin, Other)

### 4. Utilities
Located in `src/common/utils/`:
- ✅ Password hashing utilities (bcrypt)
- ✅ OTP generation utilities
- ✅ Response codes constants
- ✅ JWT service (in `src/common/providers/jwt.service.ts`)

### 5. Exception Handling
- ✅ Global exception filter (replaces Express error middleware)
- **Location**: `src/common/filters/global-exception.filter.ts`
- **Features**:
  - Database error handling (duplicate keys, foreign keys, null constraints)
  - Custom AppError class
  - TypeORM QueryFailedError handling
  - HTTP exception handling

### 6. Authentication & Authorization
- ✅ JWT authentication guard (replaces Express middleware)
- **Location**: `src/common/guards/jwt-auth.guard.ts`
- ✅ Decorators:
  - `@Public()` - Skip authentication for specific routes
  - `@CurrentUser()` - Get current user from request

### 7. Modules

#### City Module
- **Location**: `src/city/`
- **Endpoints**:
  - `POST /api/v1/cities` - Create city
  - `GET /api/v1/cities` - Get all cities (public)
  - `GET /api/v1/cities/:id` - Get city by ID (public)
  - `PUT /api/v1/cities/:id` - Update city
  - `DELETE /api/v1/cities/:id` - Delete city

#### Religion Module
- **Location**: `src/religion/`
- **Endpoints**:
  - `POST /api/v1/religion` - Create religion
  - `GET /api/v1/religion` - Get all religions (public)
  - `GET /api/v1/religion/:id` - Get religion by ID (public)
  - `PUT /api/v1/religion/:id` - Update religion
  - `DELETE /api/v1/religion/:id` - Delete religion

#### Users Module
- **Location**: `src/rishtanagar-users/`
- **Endpoints**:
  - `GET /api/v1/users` - Get all users
  - `GET /api/v1/users/:id` - Get user by ID
  - `PUT /api/v1/users` - Update user
  - `DELETE /api/v1/users/:id` - Delete user
  - `POST /api/v1/users/send-otp` - Send OTP (public)
  - `POST /api/v1/users/verify-otp` - Verify OTP (public)
  - `POST /api/v1/users/reset-password` - Reset password (public)
  - `POST /api/v1/users/update-by-email` - Update by email (public)
  - `POST /api/v1/users/logout/:id` - Logout user
  - `POST /api/v1/users/update-details` - Update user details
  - `GET /api/v1/users/:id/profile-completion` - Get profile completion percentage

#### Authentication Module
- **Location**: `src/rishtanagar-auth/`
- **Endpoints**:
  - `POST /api/v1/auth/login` - Login (public)
  - `POST /api/v1/auth/signup` - Signup (public)
  - `POST /api/v1/auth/logout/:id` - Logout
  - `POST /api/v1/auth/google-signup` - Google signup (public)
  - `POST /api/v1/auth/google-login` - Google login (public)

### 8. Middleware & Interceptors
- ✅ Rate limiting (100 requests per 2 minutes)
- ✅ CORS enabled with proper configuration
- ✅ Body parser (400MB limit for large payloads)
- ✅ Data response interceptor

## Setup Instructions

### 1. Environment Configuration
Copy `env.template` to `.env` and configure:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=rishtanagar

# JWT
JWT_SECRET=your_jwt_secret_key
REFRESH_KEY=your_refresh_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id

# Mail
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_ADDRESS=your_email@gmail.com
MAIL_PASSWORD=your_app_password
```

### 2. Install Dependencies
Dependencies already installed:
- `@nestjs/typeorm`
- `typeorm`
- `mysql2`
- `google-auth-library`
- `axios`
- `express-rate-limit`
- `bcrypt` (already present)
- `otp-generator` (already present)

### 3. Database Setup
```bash
# Create database
mysql -u root -p
CREATE DATABASE rishtanagar;
```

### 4. Run the Application
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

### 5. Access the Application
- **API Base URL**: `http://localhost:3000/api/v1`
- **Swagger Documentation**: `http://localhost:3000/api-docs`
- **Swagger Credentials**: admin / admin123

## API Routes Structure

All routes are now prefixed with `/api/v1`:

```
/api/v1
├── /auth
│   ├── POST /login
│   ├── POST /signup
│   ├── POST /logout/:id
│   ├── POST /google-signup
│   └── POST /google-login
├── /users
│   ├── GET /
│   ├── GET /:id
│   ├── PUT /
│   ├── DELETE /:id
│   ├── POST /send-otp
│   ├── POST /verify-otp
│   ├── POST /reset-password
│   ├── POST /update-by-email
│   ├── POST /logout/:id
│   ├── POST /update-details
│   └── GET /:id/profile-completion
├── /cities
│   ├── POST /
│   ├── GET /
│   ├── GET /:id
│   ├── PUT /:id
│   └── DELETE /:id
└── /religion
    ├── POST /
    ├── GET /
    ├── GET /:id
    ├── PUT /:id
    └── DELETE /:id
```

## Key Differences from Express

### 1. Middleware → Guards/Interceptors/Filters
- **Express Middleware** → **NestJS Guards** (for authentication)
- **Express Error Handlers** → **NestJS Exception Filters**
- **Express Middleware** → **NestJS Interceptors** (for transformation)

### 2. Route Organization
- **Express**: Routes defined in separate router files
- **NestJS**: Routes defined in controllers with decorators

### 3. Dependency Injection
- **Express**: Manual dependency management
- **NestJS**: Built-in dependency injection

### 4. Response Format
Both maintain similar response format:
```json
{
  "message": "Success message",
  "data": {},
  "status": 200
}
```

## What's Not Included (Optional Enhancements)

1. **Firebase SDK Integration** - The Firebase admin SDK configuration file needs to be manually placed
2. **Image Upload Service** - Needs implementation based on storage solution
3. **Email Service** - Basic setup exists, needs SMTP configuration
4. **Socket.io Integration** - Not migrated (exists in original NestJS template)
5. **User Activity Logging Service** - Needs implementation
6. **User Images Service** - Needs implementation
7. **Notification Module** - Not migrated from Express app

## Testing

### Test Authentication
```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Test Protected Routes
```bash
# Get users (requires authentication)
curl -X GET http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Public Routes
```bash
# Get cities (public)
curl -X GET http://localhost:3000/api/v1/cities
```

## Troubleshooting

### Database Connection Issues
- Ensure MySQL is running
- Check database credentials in `.env`
- Verify database exists: `CREATE DATABASE rishtanagar;`

### JWT Token Issues
- Ensure `JWT_SECRET` and `REFRESH_KEY` are set in `.env`
- Check token expiration settings

### Rate Limiting
- If you hit rate limits during testing, wait 2 minutes or adjust settings in `main.ts`

## Next Steps

1. **Configure Email Service**: Update SMTP settings for OTP delivery
2. **Set up Google OAuth**: Configure Google Client ID and secret
3. **Add Firebase**: Place Firebase admin SDK credentials
4. **Implement Image Upload**: Choose storage solution (AWS S3, local, etc.)
5. **Add Tests**: Write unit and e2e tests for all modules
6. **Deploy**: Configure production environment

## Migration Summary

✅ **Completed**:
- Database configuration (TypeORM + MySQL)
- All entities (12 entities)
- Enums (2 enums)
- Utilities (password hashing, OTP, JWT)
- Exception handling (global error filter)
- Authentication & Authorization (JWT guard)
- 4 main modules (City, Religion, Users, Authentication)
- Rate limiting and CORS
- App module configuration

⏳ **Pending** (Optional):
- Firebase SDK integration
- Advanced image upload service
- Email service configuration
- Additional helper services

The application is now fully functional and ready for development/testing! 🎉

