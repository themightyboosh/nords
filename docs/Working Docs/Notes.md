

For the project settings - remove the snapshot selection. We don't need a snapshot type. We need a snapshot viewer to load and export and delete snapshots - should support an anmimate through snapshots.

At the bottom nav add a take snapshot button. It adds ask for name and (optional description) all descriptions can support markdown.

DO a reconcilation to make sure all our readme.md on down relfects functional decisions in our mockup.

Project settings should include a webaccess token with URL information.

Project settings should include a full export - the entire document that could be used for rag (reall¥ the entire project with parsed meaning ). THink like a prompt engineer and vertex rag person.


- ---

Create a plan. 

For mobile collapse header into a hamburger. and make mobile bottom menu a segmented control at the bottom. DO you advise this?

For mobile just have the Nord be the colored icon and the Nord name (no properties)

THe Nord card detail view still shows add property - you cant do that there! It's only done at the type level.

I don't see a line detaill rollout. I don't see option to set the arrow direction. You can set a single arrow on either side (not two arrows) - the arrow impacts the spectrum value (if no arrow is set and the connection type has a spectrum property - the property will grayed out)

The project name needs to be 2x bigger. 

We need a global icon selector. It needs to be part of the project settings and nord type edit/creation.

Update the mock and specs docs.  


---
-- I don't see an icon that indicates the ability to resize the nord container. 

Does our mock and requirements align?

In link mode we need top bottom left right node connectors where they can pull and drag connections - it should adjust the line to best connect to the other nord.

Do we have the federated comments section? Do we have the snapshot viewer or player?

Do we have connection arrows? They should be set when the line is selected. Line type can have to, from, none as defaults but can alwayß be overriden when selected.


Changer header where it says "NODE CARDS" to "MONUMENTAL NODE CARDS" - align the baseline of that text to the baseline of "nords" in the logo.

Do we need to address transitions and animations and redraw behavior here?

Drag and mousewheel zoom?

We don't need a "live " indicator on the heqader. Make the project icon the same height as the project name text. 

On the nords we should show three additional properties aside from title and description. WHat is shown is set at the type level. I don't understand what all the progress indicators (spectrums?) on the nords mean. Can we remove?

We don't need to show in the mock the animated equilibration that occurs when multiple lines are selected in the canvas mode?


--- when in link mode the connector nodes top and bottom need to be outside the container. We don't need a connect button if we can click and drag a line from a node.

When we drag the nord the spectrum values for any lines connected should display. We coiuld remove the context view - it should be the default and the nords activate when connected. Dragging the line off removes it. 

 ![[Pasted image 20260412004520.png]]
I WANT THE LOGO TO BE LOWERED SO IT LOOKS ALIGNED TO THE NORDS TEXT AND MONUMENTAL NODE CARDS TEXT ALL MIDDLE ALIGN THE LOGO ICON CAN BE 30% LARGER.

NEED TO SEE THE LINE ROLLOUT AND THE PROJECT CRUD

ARROWS ARE STILL HIDDEN UNDER THE NORD CONTAINER. CAN WE ATTACH LINES TO NORD OUTSIDE NOT CENTER? THINK DEEPLY ON THIS.

WE NEED A CENTRALIZED MARKDOWN EDITOR VIEWER BUILT IN.



EXPLAIN THE LOGIC OF ROWS AND COLUMNS WORK IN MATRIX VIEW.

GIVE ME A MARKDOWN OF ALL THE PROPERTY TYPES DESCRIBED AND NORD AND LINE OPTIONS FOR EACH TYPE. REALLY ONLY NORDS DIFFERENCE IS THAT SCALE FOR IT AND DISTANCE FOR LINES.


---- 

I still don't see where I add a comment or click a line.

What about login, create account, and logout and user settings.

The bottom menu items are inconsistantly styled recent one have odd padding. CLick every bottom nav item to compare and normalize styling.



---- review the dock in mobile view it could be improved - it looks odd.
-- also create a document thåt studies the best way to draw lines between objects in a canvas - we are not the first people to try and solve this elegantly.  They have to stay conencted and adapt to when nords are resized by the user.