# Cycling

## Purpose

Regularly limit and fix the amount of time that items are active for.

## Principle

A cycle is created with a start time, a fixed period, and a number of runs, and
items are added to it. The first run lasts one period from the start time; when it
ends, the next run begins immediately, and so on until the last run ends. While a
run is happening every item in the cycle is active in that run, and once every run
has ended the items are no longer active. Changing the number of runs extends the
cycle or ends it early.

## Types

```types
external Item
  The thing whose active time is cycled.
```

## State

```state
a set of Cycles with
  a start DateTime
  a period Number
  a runs Number
  an items set of Item
  Rule: period is a positive number of milliseconds and runs is a whole number of at least 1
  Rule: an item belongs to at most one cycle
```

## Actions

```actions
create (start: DateTime, period: Number, runs: Number) : returns (cycle: Cycle)
  where period is not positive or runs is not a whole number of at least 1
  then
    refuses INVALID_CYCLE "A cycle needs a positive period and at least one run."
  where period and runs are valid
  then
    create a new cycle with this start, period, and runs, and no items
    returns cycle

addItem (cycle: Cycle, item: Item) : returns ()
  where cycle is not in Cycles
  then
    refuses NO_SUCH_CYCLE "There is no such cycle."
  where item already belongs to a cycle
  then
    refuses ALREADY_CYCLING "This item already belongs to a cycle."
  where cycle is in Cycles and item belongs to no cycle
  then
    add item to cycle
    returns

removeItem (cycle: Cycle, item: Item) : returns ()
  where cycle is not in Cycles
  then
    refuses NO_SUCH_CYCLE "There is no such cycle."
  where item is not in cycle
  then
    refuses NOT_IN_CYCLE "This item is not in the cycle."
  where cycle is in Cycles and item is in cycle
  then
    remove item from cycle
    returns

setRuns (cycle: Cycle, runs: Number) : returns ()
  where cycle is not in Cycles
  then
    refuses NO_SUCH_CYCLE "There is no such cycle."
  where runs is not a whole number of at least 1
  then
    refuses INVALID_CYCLE "A cycle needs a positive period and at least one run."
  where cycle is in Cycles and runs is valid
  then
    set the cycle's runs to runs, which ends the cycle immediately when its runs have already elapsed
    returns

delete (cycle: Cycle) : returns ()
  where cycle is not in Cycles
  then
    refuses NO_SUCH_CYCLE "There is no such cycle."
  where cycle is in Cycles
  then
    delete cycle, so its items belong to no cycle
    returns
```

## Queries

```queries
_cycle (item: Item) : optional (cycle: Cycle, start: DateTime, period: Number, runs: Number)
  answers the cycle item belongs to, and no row when it belongs to none

_currentRun (item: Item, now: DateTime) : optional (run: Number, start: DateTime, end: DateTime)
  answers the run of item's cycle happening at now, counting runs from 0, where run k
  starts at the cycle's start plus k periods and ends one period later; no row when
  item belongs to no cycle, when now is before the cycle's start, or when every run
  has ended

_all () : many (cycle: Cycle, start: DateTime, period: Number, runs: Number)
  answers every cycle ordered by start, and no rows when there are none

_items (cycle: Cycle) : many (item: Item)
  answers the items in cycle ordered by item, and no rows when cycle is not in Cycles
  or holds no items
```
