### concept Grouping

**purpose** organize items with shared characteristics to prevent being overwhelmed by many unrelated items

**principle** users create items, administrator users can create/delete groups, and users add/remove items to the groups

**state**

a set of Groups with

&emsp;&emsp;a name String

&emsp;&emsp;a set of Items

**actions**

create (User, name: String) : return (Group)

&emsp;&emsp;**where** the given user is an administrator and a group with this name doesn’t exist

&emsp;&emsp;**then** create a new Group with this name and an empty set of items then return it

delete (User, name: String)

&emsp;&emsp;**where** the given user is an administrator and a group with the given name exists

&emsp;&emsp;**then** delete the group with the given name

addItem (Group, Item)

&emsp;&emsp;**where** the group exists, the item exists, and the item is not already in this group

&emsp;&emsp;**then** add this item to this group

removeItem (Group, Item)

&emsp;&emsp;**where** the group exists, the item exists, and the item is in this group

&emsp;&emsp;**then** remove the item from this group
