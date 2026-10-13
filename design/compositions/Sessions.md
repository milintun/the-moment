# Sessions

Sessions connect accepted account credentials to opaque, independently expiring
sessions.

Registration [establishes a new account and starts a session](reaction:Sessions.Register)
for the returned account reference, which is that account's username.
[Sign-in](reaction:Sessions.SignIn) proves an existing account's credentials and starts
a new session for the returned account reference. In both cases callers cannot choose
a different subject.

```endpoints
Sessions.Register at /auth/register
Sessions.SignIn at /auth/sign-in
```

An [active session resolves to its subject username](reaction:Sessions.CurrentUser).
An unknown, ended, or expired session does not identify a current account.

```endpoints
Sessions.CurrentUser at /auth/current
```

[Signing out ends the presented active session](reaction:Sessions.SignOut). Other
sessions for the same account remain independent.

```endpoints
Sessions.SignOut at /auth/sign-out
```
