# Grouping

## Purpose

Organize items with shared characteristics, so people are not overwhelmed by many
unrelated items.

## Principle

A group is created with a name. Items are added to it and removed from it, and the
group lists the items it holds. Deleting the group leaves its items untouched.

## Types

```types
external Item
  The thing being grouped.
```

## State

```state
a set of Groups with
  a unique name String
  an items set of Item
```

## Actions

```actions
create (name: String) : returns (group: Group)
  where a group with this name exists
  then
    refuses NAME_TAKEN "A group with this name already exists."
  where no group has this name
  then
    create a new group with this name and no items
    returns group

delete (group: Group) : returns ()
  where group is not in Groups
  then
    refuses NO_SUCH_GROUP "There is no such group."
  where group is in Groups
  then
    delete group
    returns

addItem (group: Group, item: Item) : returns ()
  where group is not in Groups
  then
    refuses NO_SUCH_GROUP "There is no such group."
  where item is already in group
  then
    refuses ALREADY_IN_GROUP "This item is already in the group."
  where group is in Groups and item is not in group
  then
    add item to group
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
  answers every group with its name, ordered by name, and no rows when there are none

_items (group: Group) : many (item: Item)
  answers the items in group ordered by item, and no rows when group is not in Groups or holds no items

_groupsOf (item: Item) : many (group: Group)
  answers every group that holds item, ordered by group, and no rows when none does

_byName (name: String) : optional (group: Group)
  answers the group with this name, and no row when no group has it
```
