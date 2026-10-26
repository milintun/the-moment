# Grouping

## Purpose

Organize items with shared characteristics, so people are not overwhelmed by many
unrelated items.

## Principle

A group is created with a name, or several groups are created at once from a list of
names. Names need not be unique: two groups may share one. Items are added to a group and
removed from it, and the group lists the items it holds, including just those added
during a given span of time. Deleting the group leaves its items untouched. With many
groups, they can be listed a page at a time.

## Types

```types
external List
  An ordered list of values, as the application's runtime represents one.
external Item
  The thing being grouped.
```

## State

```state
a set of Groups with
  a name String
  a createdAt DateTime

a set of Memberships with
  a group Group
  an item Item
  an addedAt DateTime
  unique group and item
  Rule: an item is in a group exactly when a membership joins them
```

## Actions

```actions
create (name: String, createdAt: DateTime) : returns (group: Group)
  where any name is given, since names may repeat
  then
    create a new group with this name, createdAt, and no memberships
    returns group

createMany (names: List<String>, createdAt: DateTime) : returns (groups: List<Group>)
  where any names are given, since names may repeat
  then
    create a new group for each name, each with createdAt and no memberships, listed in the order of names
    returns groups

delete (group: Group) : returns ()
  where group is not in Groups
  then
    refuses NO_SUCH_GROUP "There is no such group."
  where group is in Groups
  then
    delete group and its memberships
    returns

addItem (group: Group, item: Item, addedAt: DateTime) : returns ()
  where group is not in Groups
  then
    refuses NO_SUCH_GROUP "There is no such group."
  where item is already in group
  then
    refuses ALREADY_IN_GROUP "This item is already in the group."
  where group is in Groups and item is not in group
  then
    add a membership of item in group, added at addedAt
    returns

removeItem (group: Group, item: Item) : returns ()
  where group is not in Groups
  then
    refuses NO_SUCH_GROUP "There is no such group."
  where item is not in group
  then
    refuses NOT_IN_GROUP "This item is not in the group."
  where group is in Groups and item is in group
  then
    remove item from group
    returns
```

## Queries

```queries
_groups () : many (group: Group, name: String)
  answers every group with its name, oldest first and then by name, and no rows when there are none

_page (offset: Number, limit: Number) : many (group: Group, name: String)
  answers the groups in the same order as _groups, skipping the first offset of them and
  answering at most limit, and no rows past the last group

_get (group: Group) : optional (name: String)
  answers the group's name, and no row when group is not in Groups

_items (group: Group) : many (item: Item)
  answers the items in group, most recently added first, and no rows when group is not in Groups or holds no items

_itemsAdded (group: Group, from: DateTime, to: DateTime) : many (item: Item, addedAt: DateTime)
  answers the items added to group at or after from and before to, most recently added
  first, and no rows when group is not in Groups or none were added then

_groupsOf (item: Item) : many (group: Group)
  answers every group that holds item, ordered by group, and no rows when none does

_byName (name: String) : many (group: Group)
  answers every group with this name, oldest first, and no rows when no group has it
```
