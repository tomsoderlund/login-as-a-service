# Login-as-a-Service

## API

- POST `/api/[app]/lead`: Create new lead (create new if it doesn’t exist, don’t send email)
- POST `/api/[app]/signup`: Create new user (create new if it doesn’t exist, send login email)
- POST `/api/[app]/login`: Login existing user (don’t create new, send login email)

### Login email

User gets email with link `${app.redirect_url}?token=${token}`, where `token` is a JWT token.


## How to Start

    now dev --listen 3102
