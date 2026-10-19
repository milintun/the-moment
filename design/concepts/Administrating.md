# Administrating

## Purpose

Give a chosen subset of users wider authority, under one owner who decides who
belongs to it.

## Principle

Milin is made the owner and is therefore an admin. Milin adds Gigi and Sid as admins,
so they are admins but not the owner, while Sasha is not an admin. Adding Gigi again
is refused. Milin removes Sid, and Sid is no longer an admin; removing Sid again is
refused, and removing Milin is refused because the owner cannot be removed. Making
Sasha the owner is refused because an owner already exists.

## Types

```types
external User
  A person who may be given authority.
```

## State

```state
a set of Admins with
  a unique user User
  an owner Flag
  Rule: at most one admin is the owner, and the owner can never be removed
```

## Actions

```actions
setOwner (user: User) : returns ()
  where an owner exists
  then
    refuses OWNER_EXISTS "The application already has an owner."
  where no owner exists
  then
    make user an admin if they are not one already, and mark them as the owner
    returns

addAdmin (user: User) : returns ()
  where user is already an admin
  then
    refuses ALREADY_ADMIN "This user is already an admin."
  where user is not an admin
  then
    add user as an admin who is not the owner
    returns

removeAdmin (user: User) : returns ()
  where user is not an admin
  then
    refuses NOT_ADMIN "This user is not an admin."
  where user is the owner
  then
    refuses OWNER_PROTECTED "The owner cannot be removed."
  where user is an admin and not the owner
  then
    remove user from the admins
    returns
```

## Queries

```queries
_isOwner (user: User) : one (owner: Flag)
  answers whether user is the owner, and false for anyone else

_isAdmin (user: User) : one (admin: Flag)
  answers whether user is an admin, which is true for the owner, and false for anyone else

_admins () : many (user: User, owner: Flag)
  answers every admin and whether they are the owner, ordered by user, and no rows when there are none
```
