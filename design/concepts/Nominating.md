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
it. Later Sid's "Rainy days" is chosen to become a gallery; it stays listed, marked
chosen, and can no longer be withdrawn or chosen again.

## Types

```types
external List
  An ordered list of values, as the application's runtime represents one.
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
  an optional chosenAt DateTime
  Rule: a nomination is chosen exactly when it has a chosenAt
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
  where name is empty after trimming, or longer than 40 characters after trimming
  then
    refuses INVALID_NAME "A nomination needs a name of at most 40 characters."
  where nominator's lastNominatedAt is less than one day before createdAt
  then
    refuses TOO_SOON "You can nominate once a day."
  where category is in Categories, name is 1 to 40 characters after trimming, and nominator may nominate
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
  where nomination is chosen
  then
    refuses CHOSEN "A chosen nomination can't be withdrawn."
  where nomination exists, nominator is its nominator, and it is not chosen
  then
    delete nomination, leaving nominator's lastNominatedAt unchanged
    returns

choose (nominations: List<Nomination>, chosenAt: DateTime) : returns ()
  where some nomination is not in Nominations
  then
    refuses NO_SUCH_NOMINATION "There is no such nomination."
  where some nomination is already chosen or appears twice in nominations
  then
    refuses CHOSEN "This nomination has already been chosen."
  where every nomination exists and none is chosen
  then
    set every nomination's chosenAt to chosenAt, all together or none at all
    returns
```

## Queries

```queries
_categories () : many (category: Category, name: String)
  answers every category with its name, ordered by name, and no rows when there are none

_category (category: Category) : optional (name: String)
  answers the category's name, and no row when category is not in Categories

_nominations (category: Category) : many (nomination: Nomination, nominator: User, name: String, createdAt: DateTime, chosen: Flag)
  answers every nomination in category, newest first, with whether it has been chosen,
  and no rows when there are none

_equivalent (category: Category, name: String) : many (nomination: Nomination, createdAt: DateTime)
  answers the nominations in category whose names are equivalent to name, newest first, and no rows when there are none

_byNominator (nominator: User) : many (nomination: Nomination, category: Category, name: String, createdAt: DateTime, chosen: Flag)
  answers every nomination by nominator in any category, newest first, with whether it has
  been chosen, and no rows when they have none

_unavailable (nominations: List<Nomination>) : many (nomination: Nomination)
  answers each of nominations that is not in Nominations, is already chosen, or appears
  more than once, and no rows when every one of them could be chosen together

_get (nomination: Nomination) : optional (nominator: User, category: Category, name: String, createdAt: DateTime, chosen: Flag)
  answers the nomination's details, and no row when nomination is not in Nominations
```
