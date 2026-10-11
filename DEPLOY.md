# Put Color Jam v3 on your iPhone (GitHub Pages)

Run in Terminal on your Mac (needs a free GitHub account and an empty repo named `color-jam`):

    cd ~/Workspace/color-jam/v3
    git init -b main
    git add .
    git commit -m "Color Jam v3"
    git remote add origin https://github.com/<your-username>/color-jam.git
    git push -u origin main

Then on github.com: repo > Settings > Pages > Source: "Deploy from a branch" > main / (root) > Save.
After ~1 minute the game is at https://<your-username>.github.io/color-jam/

On the iPhone: open that link in Safari > Share > Add to Home Screen.
Progress is saved on the phone (localStorage), separate from your Mac.
