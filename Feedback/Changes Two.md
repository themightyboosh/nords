
CARD VIEW


1) When the board view loads the top swimlane title doesnt appear.
2) The category rollout on the board is just visibiliy. It does not impace the open close swimlane - that's just a user setting. VIsibilty shows or hides the entire swimlane - open or closed by the user.
3) Make sure the move card to swimlane remove from current and adds to swimlane unless the option key is selected in which case it adds the new category.
4) Maybe next to the name add the number of currently visible categories this nord is connected to.

![[Pasted image 20260602143740.png]]





PERSONA

![[Pasted image 20260602144433.png]]

When the page loads can the screen scale to the outer circle.

WHEN IN personna mode ![[Pasted image 20260602144620.png]]
hitting the center square will togle between centering on the max red circle and the green circle.


To the right of nords add another button that cycles between all | cares | doesnt care (help me with better language)

Selecting all
zooms to full red circle and shows all nords

Selecting  Doesnt care
zooms to full red circle and only shows nords in that negative orbit (shows hides interactively as the bias changes)

Selecting  cares
zooms to green circle and only shows nords in that postive orbit (shows hides interactively as the bias changes)

THe user toggle/cycles through the three options 


![[Pasted image 20260602151331.png]]
The Persona name should match the personna color


PROJECT SETTINGS

![[Pasted image 20260602145243.png]]
Remove the weird line on the left that spans the graph box and system prompt. It's an artifact thats taking too much space on the left for no reason.

Remove the Access TOken and shared links from project settings.

SHARE

Create a new top nav called Share that follows the same design patter as the other menu items.
When open use the same UI admin elements to manage the title and subtitle.
Move the share links and access tokens here.
Allow multiple share links and an easy way to copy them to send 
Add a new feature where any collection property can be prefilled to be sent along the URL string so we could know their name or whatever value we know ahead of time. Use the same property design pattern and component as we do elsewhere. Test this and use stage if we need to.

GOALS

We need to be clear - simplify to conitnue, end and if end is selected a radio box that says "reset session?" The end ones are capable of terminating and being selected for test runs. The user should receive the same message when cpmplete. But if reset, it then sends the welcome message as if new.
![[Pasted image 20260602152539.png]]