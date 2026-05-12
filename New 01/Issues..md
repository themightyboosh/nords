Look inside the folders for screenshots that relate to the issue number.



1: we need to have the same header menu used globally - obviously don't need the same menu items between the projects screen and project screen.

 2: we need a new top-level menu item for a project. It can be to the left of Nords. It should allow the end-user to change the name and and add project description, purpose (both of which are manditory) If a personna exists allow them to select a default personna, if a nord exists, allow them to select a default start nord via a category, then nord, dropdown. 

3: In the board view we need to make sure the screen elements align left (see the pink line

4: when switching the category in graph view it should be remembered so if I come back to it from the persona or board view it goes back to that. This should hold true for board and persona - it goes back their states. MAke sure when retuning from personna it doesnt go back to the all categories view (we should never start there either it's somewhat depricated)

5: We are still unable to move a single card from swimlane to swimlane. Before you attack this - think of new ways to test this. The UI looks great!

6: I don't like the black border around the logo - I was hoping it would be flush around the logo. If you can't get it to work - remove it the gray border.

7:  The projects selector is cramped - apply UI spacing. 

8. Make sure creating, exporting and deleting a project work. Export can be placeholder for now. The name, description and purpose are mandatory. Add a check-box for MCP. If checked then provide a check-box for "Capture Data" and another for "Mutable (experimental)" (make sure this is also part of the project drop down in 2)

9. Now, if a project has MCP and "Capture Data Selected" for all category and Nord types - we need a section that is feature identical to Instance Properties called MCP Properties. Don't do anything else than create the UI and capture those settings. We'll eventually have an MCP use that to capture values and use the default values as "examples"