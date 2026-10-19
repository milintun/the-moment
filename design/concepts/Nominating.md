# Nominating

## Purpose

Let a crowd openly name ideas for a category, so the ideas can be compared and the
best taken forward.

## Principle

A category "Future galleries" is created. Gigi nominates "Hands", and the category
lists it with the time it was made. Looking up " hands " in the category finds Gigi's
nomination, because names that differ only in spacing or case name the same idea.
Gigi's second nomination later that day is refused because Gigi nominated less than a
day ago. Sid nominates "Rainy days", and the category lists Sid's nomination before
Gigi's because it is newer. Gigi withdraws "Hands", and the category no longer lists
it.

## Types

```types
external User
  A person who names ideas.
```

## State

```state
a set of Categories with
  a unique name String

a set of Nominations with
  a nominator User
  a category Category
  a name String
  a createdAt DateTime
  Rule: names are equivalent when they match after trimming outer spaces, collapsing inner spaces, and ignoring case

a set of Users with
  a lastNominatedAt DateTime
```

## Actions

```actions
createCategory (name: String) : returns (category: Category)
  where a category with this name exists
  then
    refuses NAME_TAKEN "A category with this name already exists."
  where no category has this name
  then
    create a new category with this name
    returns category

nominate (nominator: User, category: Category, name: String, createdAt: DateTime) : returns (nomination: Nomination)
  where category is not in Categories
  then
    refuses NO_SUCH_CATEGORY "There is no such category."
  where name is empty after trimming
  then
    refuses INVALID_NAME "A nomination needs a name."
  where nominator's lastNominatedAt is less than one day before createdAt
  then
    refuses TOO_SOON "You can nominate once a day."
  where category is in Categories, name is not empty, and nominator may nominate
  then
    create a new nomination with nominator, category, name as written, and createdAt
    set nominator's lastNominatedAt to createdAt
    returns nomination

withdraw (nominator: User, nomination: Nomination) : returns ()
  where nomination is not in Nominations
  then
    refuses NO_SUCH_NOMINATION "There is no such nomination."
  where nominator is not the nomination's nominator
  then
    refuses NOT_NOMINATOR "Only the nominator can withdraw a nomination."
  where nomination exists and nominator is its nominator
  then
    delete nomination, leaving nominator's lastNominatedAt unchanged
    returns
```

## Queries

```queries
_categories () : many (category: Category, name: String)
  answers every category with its name, ordered by name, and no rows when there are none

_nominations (category: Category) : many (nomination: Nomination, nominator: User, name: String, createdAt: DateTime)
  answers every nomination in category, newest first, and no rows when there are none

_equivalent (category: Category, name: String) : many (nomination: Nomination, createdAt: DateTime)
  answers the nominations in category whose names are equivalent to name, newest first, and no rows when there are none

_get (nomination: Nomination) : optional (nominator: User, category: Category, name: String, createdAt: DateTime)
  answers the nomination's details, and no row when nomination is not in Nominations
```
