# Login-as-a-Service

## Features

- Sign up/Login via “magic link” email (no password)
- Lead collection
- Invites (coming)
- SMS support (coming)

## How to use (signup flow)

1. Set up your `app` in the database. Point `redirect_url` to the page to process logins (e.g. `https://myapp.com/authenticate`).
2. Create a client-side form.
3. Submit `POST /api/[app]/login` (or `lead` or `signup` – see “Login/Signup/Lead” below), with body of at least `{ email }`.
4. An email is sent to the user, when link is clicked they are forwarded to `redirect_url` page with query `?token=` (a JWT token).
5. Fetch `GET /api/[app]/people/[token]` to get the User object.
6. Store at least `token` in a cookie/local storage.

### Example client-side code of steps 5-6

    export const useLoginUser = () => {
      return React.useCallback(async (token) => {
        if (!token) return
        const person = await fetch(`${config.loginService}/people/${token}`).then(res => res.json())
        const { username } = person
        saveCookie({ username, token })
        return person
      },
      [])
    }


## How to Start

    yarn now


## API

### Login/Signup/Lead

- `POST /api/[app]/login`: Login existing user (don’t create new, send login email)
- `POST /api/[app]/signup`: Create new user (create new if it doesn’t exist, send login email)
- `POST /api/[app]/lead`: Create new lead (create new if it doesn’t exist, don’t send email)

JSON fields:

- `email` (required)
- `username` (generated from email if not provided)
- `firstName`
- `lastName`
- `country` (code)
- `...metadata` for everything else

### Get user info

- `GET /api/[app]/people/[token]`: get user info from a JWT token.
