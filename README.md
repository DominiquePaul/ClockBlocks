# Clock Blocks

CB allows you to understand how you're splitting your time at work, working on a project or doing something completely different. 

For the last year I've been mostly working on my own. I'm worried about losing my edge and slacking off. If you're not working with somebody nobody will call you out for doing so. At the same time it's also easy to work your ass off, but not feel like you're moving somewhere. But things take time and knowing that I've continuously spent 9+ hours each day for the last month either coding or reading for a project gives me peace of mind when I then take a weekend off. 

But most time trackers don't allow you to understand how you're splitting your time, but only how much you've worked. Some allow you to create notes, but there aren't any that allow you to assign your time to buckets (at least I didn't find any). So I decided to build one myself.

The idea is the following: Just like a chess clock you have multiple timers and when you activate one the other timer can't run. In Clock Blocks the timer is going up, opposed to a chess clock where you're counting down. All you have to do is click on the time block to activate it. Once you activate a block no other block can run. 

There's no pause button. This is the point of this app. You want to understand how your break time compares to your work time. If you keep pausing your work timer for breaks you'll never know how efficiently you really spent your working time. Sometimes taking a break will actually make you finish a task sooner. The only thing you can do is stop a session. The way I think about sessions is that one "session" is one work day. But you can use it as you like. 

Anyhow, I hope you also find joy in this app. You can download it here [COMING SOON] if you want to give it a go!

# Features

## Time Tracking
Track your time by always assigning the time running to a block

## Dashboard
See the split for each session either across 1. all sessions or 2. by date. You can also find a table of each session or day here.

## Settings
You can 1. define, rename or delete your blocks here and 2. link to a Google sheet to which your sessions will be synced. This is optional but you might find this useful (if you're such a time tracking nerd like me) to create additional plots or dig into the data yourself.

# Roadmap

- [ ] User can estbalish a OAuth connection with Google Sheets so record is synced with a google sheet where they can create their own charts.
- [ ] User can right click on a time box and add/substract time to the clock. Useful for when you forgot to make a switch or when an activity happened before you opened your laptop that day.
- [ ] User can edit previous sessions. Necessary for the case where a session was forgotten and it's distorting all the stats.
- [ ] User can filter stats by date (or at least have a drop)

# Technical info 
The tech stack for this app is Tauri + React + TypeScript. Magic 🪄

# Development

Install packages
`pnpm install`

Start development version
`pnpm run tauri dev`

Deploy app
`pnpm run tauri build`

# Do you have a feature request?
Or did you find a bug? 🐛

Then either open an issue, create a pull request or shoot me an [email](mailto:dominique.c.a.paul@gmail.com)! I'd love to hear from you.
