# Cycling

## Purpose

Regularly limit and fix the amount of time that items are active for.

## Principle

A cycle is created with a start time, a fixed period, and a number of runs, and
items are added to it. The first run lasts one period from the start time; when it
ends, the next run begins immediately, and so on until the last run ends. While a
run is happening every item in the cycle is active in that run, and once every run
has ended the items are no longer active. Removing an item before the cycle starts
takes it out entirely; removing it once the cycle has started lets it finish the run
underway and leave from the next one, so the runs it was in stay as they were. No run
is ever left without items. Changing the number of runs extends the cycle or ends it
early, but never before the run underway has finished.

## Types

```types
external List
  An ordered list of values, as the application's runtime represents one.
external Item
  The thing whose active time is cycled.
```

## State

```state
a set of Cycles with
  a start DateTime
  a period Number
  a runs Number
  Rule: period is a positive number of milliseconds and runs is a whole number of at least 1

a set of Memberships with
  a cycle Cycle
  an item Item
  an optional lastRun Number
  unique item
  Rule: an item belongs to at most one cycle
  Rule: an item is active in run k of its cycle exactly when k is at most its lastRun, or it has no lastRun
```

## Actions

```actions
create (start: DateTime, period: Number, runs: Number, earliest: DateTime) : returns (cycle: Cycle)
  where period is not positive or runs is not a whole number of at least 1
  then
    refuses INVALID_CYCLE "A cycle needs a positive period and at least one run."
  where start is more than one minute before earliest
  then
    refuses START_PASSED "A cycle can't start in the past."
  where period and runs are valid and start is at most one minute before earliest
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
    add item to cycle with no lastRun
    returns

addItems (cycle: Cycle, items: List<Item>) : returns ()
  where cycle is not in Cycles
  then
    refuses NO_SUCH_CYCLE "There is no such cycle."
  where some item already belongs to a cycle or appears twice in items
  then
    refuses ALREADY_CYCLING "This item already belongs to a cycle."
  where cycle is in Cycles and every item belongs to no cycle
  then
    add every item to cycle with no lastRun, all together or none at all
    returns

removeItem (cycle: Cycle, item: Item, now: DateTime) : returns ()
  where cycle is not in Cycles
  then
    refuses NO_SUCH_CYCLE "There is no such cycle."
  where item is not in cycle, or item already has a lastRun
  then
    refuses NOT_IN_CYCLE "This item is not in the cycle."
  where now is at or after the start of the cycle's last run
  then
    refuses NO_LATER_RUN "There is no later run for this item to leave from."
  where every other item in cycle has a lastRun before the run item would leave from
  then
    refuses LAST_ITEM "Every run needs at least one item."
  where now is before the cycle's start
  then
    remove item from cycle
    returns
  where now is within run k of the cycle
  then
    set item's lastRun to k, so it leaves from run k + 1
    returns

setRuns (cycle: Cycle, runs: Number, now: DateTime) : returns ()
  where cycle is not in Cycles
  then
    refuses NO_SUCH_CYCLE "There is no such cycle."
  where runs is not a whole number of at least 1
  then
    refuses INVALID_CYCLE "A cycle needs a positive period and at least one run."
  where now is within run k of the cycle and runs is less than k + 1
  then
    refuses RUN_UNDERWAY "A cycle can't end before the run underway has finished."
  where runs is more than the cycle's runs and every item in cycle has a lastRun
  then
    refuses LAST_ITEM "Every run needs at least one item."
  where cycle is in Cycles, runs is valid, and the run underway (if any) is kept
  then
    set the cycle's runs to runs
    returns

delete (cycle: Cycle) : returns (items: List<Item>)
  where cycle is not in Cycles
  then
    refuses NO_SUCH_CYCLE "There is no such cycle."
  where cycle is in Cycles
  then
    delete cycle and its memberships, so its items belong to no cycle, with items the items it held
    returns items
```

## Queries

```queries
_cycle (item: Item) : optional (cycle: Cycle, start: DateTime, period: Number, runs: Number, itemRuns: Number)
  answers the cycle item belongs to, with itemRuns the number of runs item is active in
  (its lastRun plus one, or the cycle's runs when it has no lastRun), and no row when it
  belongs to none

_currentRun (item: Item, now: DateTime) : optional (run: Number, start: DateTime, end: DateTime)
  answers the run of item's cycle happening at now, counting runs from 0, where run k
  starts at the cycle's start plus k periods and ends one period later; no row when
  item belongs to no cycle, when now is before the cycle's start, when every run
  has ended, or when item is not active in the run happening at now

_previousRun (item: Item, now: DateTime) : optional (run: Number, start: DateTime, end: DateTime)
  answers the most recent run item was active in that has ended by now; no row when item
  belongs to no cycle or no such run has ended yet

_run (item: Item, run: Number) : optional (start: DateTime, end: DateTime)
  answers when run of item's cycle starts and ends, counting runs from 0, whether or not it
  has happened yet; no row when item belongs to no cycle or is not active in that run

_overlapping (start: DateTime, period: Number, runs: Number, except: String) : many (cycle: Cycle)
  answers every cycle other than except with this period and this many runs whose time,
  from its start to the end of its last run, overlaps the time from start to start plus
  runs periods, ordered by start, and no rows when there are none

_all () : many (cycle: Cycle, start: DateTime, period: Number, runs: Number)
  answers every cycle ordered by start, and no rows when there are none

_items (cycle: Cycle) : many (item: Item, itemRuns: Number)
  answers the items in cycle ordered by item, each with the number of runs it is active
  in, and no rows when cycle is not in Cycles or holds no items
```
