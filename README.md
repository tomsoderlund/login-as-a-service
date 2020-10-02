# Login-as-a-Service

## Features

- Sign up/Login via “magic link” email (no password)
- Lead collection
- Invites (coming)
- SMS support (coming)

## How to use (signup flow)

1. Set up your `app` in the database. Point `redirect_url` to the page to process logins (e.g. `https://myapp.com/authenticate`).
2. Create a client-side form.
3. Set up Mailgun for email (see below).
4. Submit `POST /api/[app]/login` (or `lead` or `signup` – see “Login/Signup/Lead” below), with body of at least `{ email }`.
5. An email is sent to the user, when link is clicked they are forwarded to `redirect_url` page with query `?token=` (a JWT token).
6. Fetch `GET /api/[app]/people/[token]` to get the User object.
7. Store at least `token` in a cookie/local storage.

### Example client-side code

A React Hook implementing steps 4 (`loginUser`) and 6-7 (`authenticateUser`):

    export const useUser = function () {
      const [user, setUser] = useState()

      useEffect(() => {
        const user = getCookie(COOKIE_NAME) ? JSON.parse(getCookie(COOKIE_NAME)) : undefined
        console.log(`User:`, user)
        setUser(user)
      }, [])

      const loginUser = async (personInfo) => {
        const result = await fetch(`${config.loginService}/signup`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(personInfo)
        })
        if (result.status === 200) {
          googleEvent('user_signup')
          return true
        } else {
          console.warn({ result })
          const json = await result.json()
          throw new Error(`Login error: ${json.message}`)
        }
      }

      const authenticateUser = async (token) => {
        if (!token) return
        const person = await fetch(`${config.loginService}/people/${token}`).then(res => res.json())
        const { username } = person
        if (!username) throw new Error(`Could not log in user – user token is invalid`)
        const userObj = { username, token }
        if (isClientSide()) setCookie(COOKIE_NAME, userObj)
        return person
      }

      return { user, loginUser, authenticateUser }
    }

### Mailgun setup

https://app.mailgun.com/app/sending/domains/mg.MYDOMAIN.com

![Mailgun setup](docs/mailgun_setup.png)


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
