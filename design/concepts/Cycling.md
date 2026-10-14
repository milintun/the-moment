### concept Cycling

**purpose** regularly limit and fix the amount of time that items are active for

**principle** a cycle is defined as a fixed period of time. After it is initialized, the first cycle run occurs for the period of time, it ends, then immediately after, the next cycle run begins, and so on. Items are associated with each cycle run and are only active when its cycle run is happening.

**state**

a set of Cycles with

&emsp;&emsp;a start time DateTime

&emsp;&emsp;a period Time

&emsp;&emsp;a number of Runs

&emsp;&emsp;a set of Runs

a set of Runs with

&emsp;&emsp;a start time DateTime

&emsp;&emsp;an end time DateTime

&emsp;&emsp;a set of associated items Items

a set of Items with

&emsp;&emsp;an active Flag

&emsp;&emsp;some content Content

**actions**

create (period: Time, runs: Number) : return (Cycle)

&emsp;&emsp;**where** period is a valid time and number of runs is greater than 0

&emsp;&emsp;**then** create a new cycle with the start time set to now, given period, number of runs, and empty set of runs, then return it

delete (Cycle)

&emsp;&emsp;**then** delete the given cycle

createRuns (Cycle) : return (Cycle)

&emsp;&emsp;**where** the cycle’s number of runs is positive and the set of runs is empty

&emsp;&emsp;**then** create a run with the cycle’s start time, end time as the cycle’s period after the start time, and an empty set of associated items. If the number of runs is greater than 1, create the next run with the first cycle’s end time as its start time, and the period after this start time as its end time. Continue this process until the cycle has as many runs as its number of runs.

activate (Run)

&emsp;&emsp;**where** the current time is between the given run’s start time and end time

&emsp;&emsp;**then** make all items associated with this run active

deactivate (Run)

&emsp;&emsp;**where** the current time is not between the given run’s start time and end time

&emsp;&emsp;**then** make all items associated with this run inactive

addItem (Run, Item)

&emsp;&emsp;**where** the run and item exist, and the item is not already associated with this run

&emsp;&emsp;**then** add this item to the run

removeItem (Run, Item)

&emsp;&emsp;**where** the run and item exist, and the item is already associated with this run

&emsp;&emsp;**then** remove this item from the run
