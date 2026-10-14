# Cycling

## Purpose

Regularly limit and fix the amount of time that items are active for.

## Principle

A cycle is created for an item with a start time, a fixed period, and a number of
runs. The first run lasts one period from the start time; when it ends, the next run
begins immediately, and so on until the last run ends. While a run is happening the
item is active in that run, and once every run has ended the item is no longer
active.

## Types

```types
external Item
  The thing whose active time is cycled.
```

## State

```state
a set of Cycles with
  a unique Item
  a start DateTime
  a period Number
  a runs Number
  Rule: period is a positive number of milliseconds and runs is a whole number of at least 1
```

## Actions

```actions
create (item: Item, start: DateTime, period: Number, runs: Number) : returns (cycle: Cycle)
  where period is not positive or runs is not a whole number of at least 1
  then
    refuses INVALID_CYCLE "A cycle needs a positive period and at least one run."
  where item already has a cycle
  then
    refuses ALREADY_CYCLING "This item already has a cycle."
  where item has no cycle and period and runs are valid
  then
    create a new cycle for item with this start, period, and runs
    returns cycle

delete (cycle: Cycle) : returns ()
  where cycle is not in Cycles
  then
    refuses NO_SUCH_CYCLE "There is no such cycle."
  where cycle is in Cycles
  then
    delete cycle
    returns
```

## Queries

```queries
_cycle (item: Item) : optional (cycle: Cycle, start: DateTime, period: Number, runs: Number)
  answers the cycle for item, and no row when item has no cycle

_currentRun (item: Item, now: DateTime) : optional (run: Number, start: DateTime, end: DateTime)
  answers the run happening at now, counting runs from 0, where run k starts at the
  cycle's start plus k periods and ends one period later; no row when item has no
  cycle, when now is before the cycle's start, or when every run has ended
```
