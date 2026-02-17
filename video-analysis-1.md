# Video Analysis: "Will OpenAI Tank OpenClaw?"

**Source:** https://www.youtube.com/live/0n5Wtptabw4
**Show:** This Week in Startups (TWIST)
**Date:** Monday, February 16, 2026
**Duration:** ~1h 41m
**Hosts:** Jason Calacanis (@jason), Alex (@alex)
**Guests:**
- **Heaton Shah** — CEO of Crazy Egg, serial founder/technologist, OpenClaw power user
- **Jesse Jana** — Former startup founder (YC alum), homeschooling mom, OpenClaw user
- **John Arrow** — Creator of "AI Coffee with Scott Adams" (joins mid-show)
- **Lon Harris** — Editorial director at TWIST

---

## Executive Summary

This live episode of TWIST covers the bombshell news that **OpenAI (Sam Altman) has effectively acquired OpenClaw** — the fastest-growing open-source GitHub project ever — by hiring its solo creator "Peter" and placing the project under a foundation led by Dave Morrow. The hosts and guests debate whether this is a brilliant defensive move by OpenAI to neutralize a threat to their distribution, or a net positive for the ecosystem. The show also features live demos of OpenClaw use cases (homeschooling, competitive intelligence, personal CRM, skill-building), a segment on the AI Scott Adams controversy, and a discussion of the broader cultural/entrepreneurial significance of the agent era.

---

## Major Topics & Timestamps

### 1. BREAKING: OpenAI Acquires OpenClaw (~0:00–25:00)

**The Deal:**
- OpenAI/Sam Altman has brought Peter (OpenClaw's solo creator) into OpenAI
- OpenClaw itself is being placed into **a foundation** with Dave Morrow involved
- No explicit purchase price was disclosed publicly
- Jason estimates the deal at **$250M–$500M in cash/stock as signing bonus**, plus another **$250M–$500M in retention/vesting** over 4 years — totaling potentially ~$1B
- Rationale: Peter could have easily raised $50M–$100M from Sequoia, a16z, etc. at a $500M–$2B valuation, so OpenAI had to beat market
- This happened just **~24 days** after OpenClaw launched — potentially the fastest solo-founder unicorn exit ever

**Jason's Cynical Take (worst case):**
- OpenClaw was **commoditizing OpenAI, Claude, and all LLM providers** by winning the interface/distribution layer
- Users stopped going directly to ChatGPT/Claude/Gemini — they just used OpenClaw agents, which made LLM providers interchangeable commodity token suppliers
- OpenAI's strategy: **absorb the threat**, let the open-source project stagnate, use Peter's talent to rebuild the same functionality directly inside ChatGPT
- Within 6–12 months, ChatGPT will flip from a chat interface to a **persona/agent-first interface** — one-click setup for a billion users
- The open-source project gets left to Dave Morrow while OpenAI captures all the value
- All user data, innovations, and privacy go to OpenAI — "every single thing Jesse is doing with homeschooling will be owned by Sam Altman"

**Jason's Optimistic Take (best case):**
- For less than **10 basis points of OpenAI's ~$1T valuation**, Sam gets Peter in the building, watches the open-source project's roadmap, and ensures OpenAI's products (Codex, etc.) stay integrated as defaults
- It's purely a **defensive intelligence play** — have the smartest agent-builder on your team informing your consumer product
- **Dave Morrow** is described as "one of the most thoughtful, creative, honorable human beings" in tech — the opposite of Zuckerberg/Altman in terms of ethics — so the foundation may genuinely protect the project
- Heaton compares Peter's situation to **Sean Parker joining Facebook** — someone to help rationalize what's happening

**Guest Reactions:**
- **Heaton:** Pragmatic — "something had to happen," open-source projects are better when supported. He's focused on using the tech and contributing
- **Jesse:** Hopeful the product keeps improving, notes the irony of "Open" in both names, worried about privacy (especially children's education data)

**Jason's Call to Action for the Community:**
- **Must maintain OpenClaw as truly open-source** — community must prevent lock-in
- Four pillars to defend: **Security, Ease of Use, Hosting (cheap/distributed), Skills (open-source)**
- His firm **Launch** is investing heavily: 
  - **Founder University** next cohort = 200 people building OpenClaw startups
  - **10 slots × $25K** for nascent projects (will help find co-founders)
  - **10 slots × $125K** for launch accelerator
  - ~$1.5M going out in the next two weeks to OpenClaw startups
  - Contact: **openclaw@launch.co**
  - 10+ investors have asked to blindly match Jason's investments
- **"2026 in our firm is the year of OpenClaw"**

---

### 2. Jesse's OpenClaw Demos: Homeschooling Revolution (~25:00–45:00)

**YouTube Curation App for Kids:**
- Built a custom app that replaces YouTube's algorithm with **curated "streams"** (engineering, science, camping, etc.)
- An OpenClaw agent finds and selects videos matching chosen content streams — **not static playlists**, dynamically curated by AI
- Built a TV interface where kids can only play/pause/advance — **no access to YouTube's recommendation algorithm or Shorts**
- "The slop is over" — kids can't click on AI-generated clickbait thumbnails
- **Built entirely on her phone** via voice notes to OpenClaw (she can't sit at a computer with 4 small children)
- She coded this using Claude Code and Codex through OpenClaw
- Jason immediately offered to pay $100/month for it

**Homeschool Curriculum System (Obsidian-based):**
- Uses **Obsidian** (markdown-based knowledge management) as the "brain" of her homeschool
- Her co-founder from previous startup is now **CEO of Obsidian** (convenient alignment)
- OpenClaw writes full lesson logs from **photos + voice notes** — she doesn't touch a computer
- Example: Takes a photo of kids doing color theory, does a voice note, OpenClaw writes the entire structured lesson log
- Vision: When kids turn 18, give them the **complete history of their education**
- Can ask OpenClaw "what did Ford do last week?" to plan next week's lessons
- Compares to what teachers always ask for: less admin, more time with students

**Business Potential:**
- Homeschooling has grown from ~1% to ~6% of US kids in one generation
- Jesse believes it can pass **10% within a few years**
- Jason compared it to the **Uber model** of democratizing access:
  - Uber/Maybach = rich families with private teachers (already exists)
  - Uber Black = families paying $500–$1,000/month for tools + curriculum + community
  - Uber X/Pool = free tools and advice for everyone at the bottom
- **Jason offered Jesse $125K** from the Launch Accelerator to pursue this — she tentatively accepted on air
- Jesse is a YC alum, has managed 100+ employees historically

**Key Quote from Jesse:**
> "I was a previous founder who hadn't opened terminal until six months ago. After six months of Claude coding then OpenClaw, I can build anything. Software is feeling free to me."

---

### 3. Heaton's OpenClaw Demos: Business Intelligence & Pair Prompting (~45:00–60:00)

**Personal CRM / Contact Database:**
- Fed LinkedIn contacts + Gmail contacts from multiple accounts into OpenClaw
- Had it build a database, **score, prioritize, and tier contacts** for outreach
- Built in ~30 minutes — replaced what would have required finding/paying for multiple tools
- Deliberately avoids full automation (learned from cal.com founder's embarrassing auto-unsubscribe incident)
- Now replicating this at Crazy Egg for business development

**Self-Building Dashboard ("Otus"):**
- An OpenClaw instance that **built its own web dashboard** — file explorer, memory search, skills area
- Heaton logged in for the first time on the show — the bot built and iterated on it autonomously over ~15-20 days
- Running in the cloud, with a local Nvidia 5090 for training/bigger model jobs
- Uses Open Router for model access
- Has automated eval loops: **AI evaluating AI** on workloads to optimize for efficiency/quality

**Skill Builder from Jason's Book:**
- During the live show, Heaton's bot "Bob" was reading Jason's book (PDF), extracting frameworks ("Four Founder Questions," "Why Now," "Portfolio Math"), and **building OpenClaw skills** from them in real-time
- The skill builder itself was a custom-built skill that recursively improves other skills
- Also built a **research/dossier tool** — created a full dossier on Jason in minutes, with fact-checking across multiple sources

**Pair Prompting (New Method):**
- Heaton uses a **private Slack workspace** (heaten.slack.com) to onboard people into working with AI
- Invites collaborators in, has bots analyze their work, build skills from it
- Describes it as "indoctrinating humans into understanding how these AIs work"

**Key Analogy from Heaton:**
> "With ChatGPT or Claude, you get a car. With OpenClaw, you get a car AND the mechanic built in."

---

### 4. Models & Token Economics (~20:00–30:00, scattered)

**What people are running:**
- **Jesse:** Primarily Gemini + Anthropic models, agents flip between them to optimize token usage. Mac Studio on order (backordered). Spending sometimes $15 every 45 minutes on Anthropic when cranking. Total: low thousands/month
- **Heaton:** Kimi for coding, local Llama for training. Doing automated evals to find optimal model per task
- **Alex:** Tinkering with GLM 4.7 (from ZhipuAI/Z.AI), GLM 5 just came out. Notes many cheap new models
- **Jason:** Burned through first $50 of Anthropic API credits instantly using Opus 4.6 for wrong tasks — "everyone learns that lesson about one time"

**Key insight:** Users become "token junkies" — the discussion quickly becomes "how do we get maximum tokens for lowest price?" This commoditizes LLM providers, which is partly why OpenAI wanted to acquire OpenClaw.

**Local models are the next frontier:** Jesse wants Mac Studio for local inference to save money and protect children's education data. The shift to local is "scary for Sam Altman" because it removes both revenue and data access.

---

### 5. The Death of UIs / Appless Future (~55:00–60:00)

**Jesse's thesis:**
- Started building an app 6 months ago, then OpenClaw launched and she realized: **"Why? There's no app. We are in an appless world."**
- Doesn't want her husband to download an app — just chat with the agent
- "Apps are dead. What's the future of UI?"
- Even Heaton doesn't log into his dashboard that the bot built

**Markdown as the universal format:**
- Both Jesse and Heaton emphasize **markdown files** as the perfect intersection of human-readable and AI-readable
- Jesse found an article with a "Copy in MD" button and was thrilled — "This person gets me"
- Workflow: Copy article as markdown → give to agent → agent reads it → "Make me a podcast" → listen while holding baby

---

### 6. Cognitive Overload & How to Start (~60:00–65:00)

**Jesse's approach:** Follow the natural progression of your day. When mental load maxes out on something, give that job to OpenClaw. Example: Overwhelmed by homeschool supply inventory → took photos → OpenClaw made inventory → now tells her what to pull out. "Be a JOMO (joy of missing out) person, not a FOMO person."

**Heaton's approach:** "Whack-a-mole" — whatever the current problem is, throw it at OpenClaw. "Every time it seems to do that 100x faster. Once you get in the habit, it's just like using ChatGPT."

---

### 7. Why Entrepreneurs Get Addicted to OpenClaw (~65:00–72:00)

**Jesse:** "We as founders always thought we could do it all. Now we can. I can extend myself infinitely."

**Heaton:** "Agency. Founders naturally have agency. This gives you so much more. I'm up till 2-3 AM — haven't done that since college." His marketing agency client increased efficiency 10x overnight.

**Alex:** "It's turned me into the person I wanted to be if I was better with semicolons, patience, and syntax. I feel 10 feet tall. I no longer have to ask permission for anything."

**Jason's Grand Framing:**
> "This speaks to rugged individualism and the ability to carve a place in the future by shipping products. This is a gold rush. If you're willing to go through the Donner Pass and you time it right, you might be the first to the promised land."

Compares to: ships/exploration era → American frontier/Gold Rush → PC revolution → internet/broadband → mobile apps → **now: agents/OpenClaw**

---

### 8. AI Scott Adams Controversy (~72:00–95:00)

**Background:**
- Scott Adams (Dilbert creator) passed away January 2026
- He had publicly stated dozens of times he wanted to be turned into an AI, pledged his likeness to the public domain
- John Arrow and his brother created "AI Coffee with Scott Adams" using ElevenLabs (voice), Fal.ai (video generation)
- Got a huge following on YouTube, then **YouTube banned the account** claiming "people might be confused" that Scott had come back from the dead
- Now operating on X (Twitter), also launched "AI Abigail" (fictional AI daughter of Scott) as a workaround
- Estate has not formally contacted them; community is split

**Legal Analysis (Jason):**
- **Right to Publicity** — exists at state level, not federal
- States like Texas: 60 years after death, can't use someone's likeness commercially without permission
- Protected categories: editorial use, parody, artistic expression, news reporting
- The more realistic the AI looks, the harder to claim "parody"
- Jason's ruling: Either make it clearly non-realistic (puppet/cartoon/different character) OR break bread with the family and get a license

**Lon's Take:**
- Compares the situation to **DNR (Do Not Resuscitate) orders** — we may need "Do Not Replicate" legal documents as part of estate planning
- The issue is the realism — "it took me a second to realize this wasn't real footage"

**Jesse's Insight:**
- Much of the pushback isn't about this specific case but about **generalized AI fear** — "If we allow this, what's next?"
- Cost barrier has collapsed — replicating someone used to cost hundreds of thousands, now it's an afternoon project

---

### 9. Rapid-Fire Audience Q&A (~95:00–end)

**Q: What's the first role startups should automate with agents?**
- **Customer support** → bridging tickets to product features
- **Hiring** → finding candidates
- **Go-to-market** → finding potential customers
- All involve outreach + interpretation, and lower costs or increase revenue

**Q: How do you ensure personal security with OpenClaw?**
- Start with a cloud persona with **no access to your data**
- Give it its own Gmail, own calendar
- Share individual docs via read-only access
- Step by step, brick by brick, increase access
- Train it to **only communicate on one specific Slack channel**
- "Never send emails. You can read emails only."
- Injection attacks go away if it's trained not to respond to outside communications

**Q: How will OpenClaw be adopted by private equity / affect SaaS?**
- Data systems of record (Salesforce, HubSpot) will persist but get **stripped down**
- Instead of 20 seats, drop to 2 (admin + replicant), interface through Slack
- Eventually people will build their own CRM on-prem
- Risk for SaaS: **stickiness shifts from the software to the bot**

**Q (comment from Chance J. Robinson):** "AI got a little stale. In comes Claudebot, OpenClaw, and overnight the curious genius wakes up again."
- Jason agrees: the jump from "better search engine" to **agents that take real-world actions** (buy tickets, manage calendar, download content) is the breakthrough
- "We've squeezed as much juice as we can from deep research" — the value is now in *doing things*

---

## Products, Tools & Services Mentioned

| Name | Category | Notes |
|------|----------|-------|
| **OpenClaw** | AI Agent Platform | Open-source, fastest-ramping GitHub project ever |
| **ChatGPT / OpenAI** | LLM Provider | Acquiring OpenClaw's creator |
| **Claude / Anthropic** | LLM Provider | Jesse's primary model provider; Co-work product |
| **Gemini (Google)** | LLM Provider | Jason predicts will "win the consumer" |
| **xAI (Grok)** | LLM Provider | Predicted to win news/breaking news |
| **GLM 4.7 / GLM 5 (ZhipuAI)** | LLM Models | Chinese AI lab, cheap models |
| **Kimi** | Coding Model | Heaton uses for coding tasks |
| **Llama (Meta)** | Open-source LLM | Heaton uses for local training |
| **DeepSeek** | Open-source LLM | Mentioned as local model option |
| **Codex (OpenAI)** | Coding Agent | Mentioned as competitor to Claude Code |
| **Claude Code** | Coding Agent | Jesse uses via OpenClaw |
| **Open Router** | Model Router | Heaton uses for multi-model access |
| **Obsidian** | Knowledge Management | Jesse's homeschool "brain" — markdown-based |
| **Slack** | Communication | Primary interface for OpenClaw agents (both Heaton & Jesse) |
| **GitHub** | Code/File Storage | Heaton uses shared repos for multi-agent collaboration |
| **Brave** | Web Search API | Mentioned as agent web search tool |
| **Circle.so** | Community Platform | Show sponsor; used for Founder University |
| **ElevenLabs** | Voice AI/TTS | Used for AI Scott Adams voice |
| **Fal.ai** | Video Generation | Used for AI Scott Adams video |
| **Crazy Egg** | Analytics/Heatmaps | Heaton's company, using OpenClaw internally |
| **Next Visit** | Medical Note-taking | Launch portfolio company; doctors getting back 33% of time |
| **Mac Mini / Mac Studio** | Hardware | Essential for local model inference; backordered |
| **Nvidia 5090** | GPU | Heaton uses locally for training |
| **Plaude Pin** | AI Hardware | Jason's wearable AI note-taker |

---

## Key Business Implications

1. **LLM Commoditization:** OpenClaw (and similar agent platforms) commoditize LLM providers. Users optimize for cheapest tokens, not brand loyalty. This is existentially threatening to OpenAI, Anthropic, Google, etc.

2. **Interface > Model:** Whoever owns the agent interface owns distribution. OpenAI's acquisition is defensive — they're protecting their distribution moat.

3. **SaaS Disruption:** Traditional SaaS tools (CRM, project management, etc.) face seat-count compression. Companies may drop from 20 seats to 2, interfacing through agents instead of UIs.

4. **Open Source Defense:** The community must actively prevent OpenAI from capturing the skills ecosystem, hosting layer, or security model. Competitive hosting and open-source skills are critical.

5. **Solo-Founder Leverage:** Non-technical founders can now build full applications (Jesse built a complete app on her phone while holding a baby). Software development costs approach zero for many use cases.

6. **Privacy vs. Convenience:** The tension between cloud-based AI (convenient, expensive, data-exposed) and local models (private, cheap, harder to set up) will define the next wave. Families putting children's education data in the cloud is a particularly sensitive case.

7. **Digital Afterlife / Right to Publicity:** AI clones of deceased public figures present novel legal challenges. Expect "Do Not Replicate" to become part of estate planning. YouTube's ban of AI Scott Adams signals platform uncertainty.

8. **Investment Thesis:** Jason's firm Launch is going all-in on OpenClaw ecosystem startups. The four pillars: Security, Ease of Use, Hosting, Skills. Multiple top-tier investors are asking to co-invest blindly.

---

## Notable Quotes

> **Jason:** "Whoever wins the interface wins the day. It was becoming very clear that the front door for using AI had switched from ChatGPT chat room to people using OpenClaw."

> **Jesse:** "I was a previous founder who hadn't opened terminal until six months ago. Now I can build anything. Software is feeling free to me."

> **Heaton:** "With ChatGPT or Claude you get a car. With OpenClaw you get a car AND the mechanic built in."

> **Jesse:** "Apps are dead. We are in an appless world. I don't actually want an app. I don't want an icon."

> **Jason:** "This is a gold rush. Rugged individualism and autonomy. If you're willing to go through the Donner Pass, you might be the first to the promised land."

> **Jesse:** "I'm price-anchored to how much people cost. Even when I'm spending a lot on these models, I'm getting projects done that I wish I was able to do four years ago."

> **Jason:** "2026 in our firm is the year of OpenClaw."

---

## Full Transcript

*(Below is the complete transcript extracted from YouTube captions)*

---

Custom streaming services going out and hopefully we're recording and recording and recording. Alrighty.

Not live yet on the YouTubes. We have a backup recording going. Recording in progress. There it is. All right. There it is. Oh my god, we are live. Okay, we're live. All right, here we go. In three, two. All right, everybody. Monday, February 16th, 2026. Lots of news. He's at Alex. I'm at Jason. This is Twist. We have a breaking news story that dropped Sunday. Open Claw getting bought by the evil empire. Open AI Sam Altman has bought Open Claw. Here we are in AD 24 or AO 24 days after we started talking about the incredible open source project OpenClaw and it's already been purchased. We're going to talk all about what that means and handicap it. Alex, you decided to bring some great guests on today for our Monday show of Twist. Who do we got?

Yes, we got a couple of awesome guests. First up, we have Heaton Shaw, someone that I've known in the technology world for a very long time. He's the CEO of Crazy Egg, prior co-founder and CEO of a number of other companies, fantastic technologist and OpenClaw fanatic. Haten, thank you for coming on the show. And we also have Jesse Jana. She is a former founder and currently a homeschooling mom. and she's using OpenClaw in and around how she teaches her kids about the world. So two different use cases, two different awesome people, but OpenClaw, Jason, as you know, has a lot of uses. So, I figured let's bring them both on and learn from each of them.

All right. And Heaton, my god, I've known him for a long time. He's an OG now. He's an OG now. He's got the gray hair, but he was a kid in the web two era. And Jesse, I saw you on Twitter talking all about your homeschooling, which of which I'm a fan of, and how you're doing incredible things with Open Claw. Before we get to each of your individual uses of OpenClaw, this incredible new platform, we have to talk about what some people feel is a rug pull. What some people feel is the end of the project. What other people feel is going to be just fine and they're extremely happy for the founder of Open Claw to secure a bag in under 60 days. This is going to wind up being the largest, if it is in fact a unicorn, which I'm sure with the stock options it will be. Alex, this would be the solopreneur billion-dollar company that we've been talking about.

Yeah, kind of. So, this is the thing that I'm really curious about and I wanted to talk about it with the group because the numbers aren't super clear. The way they've phrased this is Peter's going to Peter, the guy behind OpenClaw originally, is going to join Open AI and they're going to put OpenClaw into a foundation that Dave Morren is involved with and so forth. But Jason, what was not discussed at any point was an enormous pile of money going from Sam Altman's pocket to Peter's pocket, at least explicitly. So, is he being brought on to OpenAI with a fat sack of stock options as an equivalent to an acquisition? Is that how you see this working out? My guess, I am strictly guessing here, is that they gave him a pile of cash as a signing bonus. I would estimate that would be a nine figure kind of mid deal. I would put it at 250, maybe even as high as 500 million in some combination of cash and stock in OpenAI. Then he was probably given another equal amount to be a team member of OpenAI for the next four years. I would then put the deal at 250 + 500, 500 plus 500, something in that zone because he could have easily raised $50 million at a 300, 400, $500 million valuation, perhaps even a billion dollar valuation from investors. So what OpenAI had to beat was a hundred million from Sequoia, Andreessen, GC, any number of firms would have given him a hundred million plus maybe bought a hundred million of his shares at a let's call it a billion dollar post, a $2 billion post because this is such a phenomenon it is the highest ramping ever GitHub project therefore you have to beat market.

I'm going to guess what Peter did and he will tell us over time and he's interacted with me a bunch over the weekend and in my threads because I had told him and I had DM'd him like, "Don't do it. Don't do it. Don't do it. You're the chosen one. This is the chosen project. Do not sell to Sam Altman. Don't do it. Look at Sam Altman's history. Look at what he did to Elon. Look at his co-founders leaving. Look at him almost getting fired. Just look at that track record. Look at the YC track record." And this is nothing against Sam Altman. We're friendly and we've known each other for over 20 years. But he's a cutthroat guy. He's known as a dealmaker. Doesn't surprise me that he got this deal because he's from the Zuckerberg school. I've said this over and over again. He is as sharp as a blade gets. He is the greatest deal maker of this generation, I believe, or will become.

All right. So, we have two founders with us. I'm curious. First of all, first reactions to the deal. And do you guys agree with Jason's framing about the financials here? Let's do Heaton and then Jesse.

Something had to happen. If you look at all the open-source sort of projects that are out there, it's better when they're supported. So, you know, that's kind of my current take. Someone was going to support it. It just happened really fast. And so, there's a lot of news and drama about it. And of course, lots of opinions. I don't have any except I'm here to use the technology to the maximum benefit I can get and contribute as much as possible.

Jesse, I hope... Yeah, I think as a user, I hope the product just actually keeps getting better and better. I think obviously there's a little irony like we've got open claw and we've got open AI. And maybe they're not so open. Hopefully open claw continues to be an amazing open source project. We'll see.

All right. So, Jason, you were talking about how you were worried, you know, this is the chosen app. Don't sell to Sam. The foundation model, there's a lot of open source foundations out there. Kind of a tried-and-true method. Do you think that it's going to be a good setup for Open Claw to persist and keep improving over time or is this more of a sop to keep people happy as OpenAI tries to get all the juice from the particular lemon?

Okay, I'm going to give you the most optimistic take and I'm going to give you the most cynical worst case scenario. Give you both. Which one do you want first, Alex?

I want the cynical first and then good after that. Yeah.

Okay. Here's the most cynical take. This technology was becoming so powerful that it commoditized OpenAI and Claude because it wins the interface. Whoever wins the interface wins the day. You can see the Chrome browser. You can see MacOS. You can see Windows. If you own the operating system, you own the distribution. It was becoming very clear that the front door for using AI had switched from ChatGPT chat room to now people using OpenClaw. Anybody using OpenClaw stopped going to Claude, xAI, Gemini, you just stop going there and you interact with your agent and your agent goes and interfaces them which commoditizes them. We know it commoditizes them because the discussion in under 10 days became in our organization, how do we get the maximum number of tokens for the lowest possible price and everybody and I'm sure Jesse I see her nodding and Heaton will all agree that you become a token junkie when you start using this and you say I have to get a Mac Studio because I want to run Gemini or I want to run DeepSeek.

So that is the most cynical take. So what would you do if a most cynical person in the world, the most cutthroat person in the world, let's call him Zuckerberg, what would Zuck do? What would Microsoft do? What would Gates do? These are the two litmus tests, most cutthroat. What they would do is they would sabotage that interface and make a better one inside their product. What are they going to do with OpenClaw? They're going to let it chug along, but then they're going to use Peter and his big brain. They're going to rebuild this product inside of OpenAI. And instead of going to OpenClaw and doing all this chores and tedious work to set it up, they're going to make it one click and give it to their billion users because they have distribution in order to preserve their distribution. And then whatever innovations, the safest, most innovative, easiest version will be the default interface on ChatGPT within 6 to 12 months. In other words, in ChatGPT, you're not going to get a chat interface and ask a question to pick a model. You're going to get a persona and the persona is now going to operate and they will flip the default and it will start with two buttons: your assistant's name or ChatGPT. Which would you like to use?

And then at some point they flip the default. That's the most cynical take. And then they leave it to Dave Morren.

That sounds awesome. What you're describing sounds awesome to me. I'm struggling to find the cynicism here.

Because it won't be open source anymore. And it will lock in all your data and take every innovation and privacy you have and give it to OpenAI. So every single thing Jesse is doing, we're going to hear about her project in a moment. Every single thing Jesse is doing with homeschooling will be owned by Sam Altman.

Jesse is going to have local models. Like don't you think that's what they're... Isn't that probably what they're scared of? Right. So like if you're willing to get your Mac friends over here going then... Yeah. Is that five Mac minis? They're outnumbering the children. But if you're willing to do that, then you're probably willing to figure out how to do local models and that must be scary. So that's the scary because if you're chewing tokens and you're telling your agents like, "Okay, chew less tokens, get more optimized." I've got a nightly build every night where they're figuring that out together as a group, then they're going to say they're going to be like, "We need a Mac Studio right away, Jesse." Like that's you wake up to that news. That must be scary if you're Sam Altman because basically not only do I not want him owning my data, but I also just want to save money and I want to have a private, you know.

So, you're aligned with me with the most cynical version of why he's doing it, Jesse?

Yes, I'm aligned with you. I think that there will be folks leading the charge and I would put myself in this bucket to even if that future is ahead of us that there's going to be these alternative paths to going local and keeping your privacy and that's really important especially when I think about like my children's entire education being like sitting on a Mac Mini or something. But I understand consumers like ease but I think they also like saving money and local models are going to start being such a delta. So, I don't know how that's going to pan out.

We're going to get back to the model thing, but I want to hear the other side of Jason's argument. Jason, what's the non-cynical take here?

Here's the most non-cynical take. Sam Altman is going to build agents and they will become the default or a major part of what he's doing. OpenAI has fallen behind and everybody has fallen behind Anthropic because of Co-work. Now, this has been a case of leapfrog. We all know that. But Gemini is going to win the consumer. That's my belief. And Claude Co-work was going to win business. And that's where it was trending. And I would say xAI was going to win news and breaking news, right? And data centers and space, whatever. So, and then you've got all the open source models. I believe open source is going to win the day on the token race.

Okay, put that aside. The most optimistic model is Sam for less than if he gave a billion dollars less than 10 basis points in the value of OpenAI say it's a trillion dollar company. He gave one-tenth of 1% to have this person in the building and 10 people around him and gets to watch their meetings gets to say oh here's what they're doing here's the plans for this open source project how does that inform everything we do. And then, hey, can we just make sure that instead of it defaulting to Claude's code versus Codex, like that could be the reason. Just want to make sure that OpenAI's Codex is in there. Want to make sure OpenAI's got the hooks in there as much as possible. So, it's just a defensive strategy to make sure that they're locked in and they have as much intelligence as possible. So, you're giving Peter a billion dollars to be in the room with him to watch him work on the open source project so the rest of your team's informed for their consumer-based agent that gets to know you like OpenClaw.

And then Dave Morren is one of the most thoughtful, creative, honorable human beings that I've met in the industry. Let me say that clearly. Sam Altman knows like Sam Altman and Zuckerberg. The opposite of that would be Dave Morren. That's the opposite, right? Dave Morren is the high ethics, do the right thing for the community guy. Zuckerberg and Sam Altman would be do the right thing for the share price guy. Two different types of motivation.

Yeah, I see you nodding your head about the Dave comments. What's your take on him being part of the foundation helping set it up?

You know, I was talking with some of my friends. I think you folks will appreciate this analogy, but is he like Peter, like Sean Parker? Like that's all I could think of, right? Like someone who helps him kind of understand and rationalize what's going on in his life all of a sudden. That's kind of how I would put it. So I echo Jason's statements that someone should do it. Dave is a great person to be the one to help out with that.

Yeah. Makes sense. That's a great analogy. You're bringing some humanity and a thoughtfulness.

So then the question becomes what do we do here as a community? What do we do as a community? And I think what we have to do as a community is build this product and support so many people working on it that it never gets locked into OpenAI. So how do we do this? Number one, security. Number two, ease of use. Number three, 10,000 hosting services, a thousand hosting services driving the price down. So, we're going to invest here at my firm Launch and our accelerator any two or three entrepreneurs that want to work on security, ease of use, hosting or skills. If you have, and obviously any other idea like Jesse's idea I love, but and the application layer but of those four core principles the skills remain open source the security is paramount the hosting is cheap and widely available.

Anything in that range, we want to fund. We funded two companies on the show last week. I have 20 slots, 10 in Founder University, 25K checks. That's for like really nascent projects, two or three people working on them. And if you're just one, we'll find you two other co-founders. We're going to do a co-founder open co-founder matching service. On the other side, if you've got the product made, maybe even have a thousand or 10,000, then we'll do the 125K. Come to the Launch Accelerator. Then I will introduce you to every investor I know. I had 10 investors email me the past week. Can I invest in the companies you're investing in? You're ahead of me on this. Just tell me what to put money in. Literally had like one of the highest profiles who just said, I'll match every investment you make blindly, JCAL. I trust your judgment. So, we're going to put all of our energy into OpenClaw for the next year. 2026 in our firm is the year of OpenClaw. Must maintain this open-source project. Ease of use, security, skills and a competitive hosting environment so that we don't get into a situation where one person owns the hosting. Somebody they get the skills, you know, they come up with some crazy "We're going to have the skills inside of OpenAI so it's safe for you" and they hijack that out of the project. Right? That's my concern is they hijack hosting. They hijack skills. We're not gonna let them.

Yeah. But I think what's cool is you can just say to your OpenClaw "hey build this skill." So basically like I think what's so mind-bending is you know software like I built something for my kids software wise that I'm a previous startup co-founder who hadn't opened terminal until six months ago. Okay. So my co-founder was technical. But after six months ago started Claude coding then OpenClaw and now I can build anything like software is feeling free to me and I know and I used to pay hundreds of thousands of dollars to developers. It didn't feel free in the past. So that doesn't that just mean like it's going to be hard for anyone to control when I can say build me this skill and it just I have it in an hour.

So I had the same experience. I was worried about security when I was rebuilding my OpenClaw instance, Jesse. And I literally was just like, "Wait a minute, why don't I just make all these skills myself?" Like, why would I bother to go through the security risk?

Way less security issues like someone was talking about a security issue with a certain skill. And so like instead of installing, you know, get this skill, I just went to my OpenClaw and I said, I like this skill, make this for me private.

So Heaton, please.

I got to chime in here. I think Alex, if you were looking at the Slack I added to you, you'd know why, but you might not have been looking at it. So, while we were talking, I got Jason's book. It's probably somewhere on my shelf, but I have a PDF of it. Don't ask me how I got it. And...

You got it on the dark web. I know. I got it. But I got it back here. I paid for it, Jason. It's a great book.

Okay, great.

And basically, I took the book and I think you might remember the four founder questions. So yeah, right now Bob, one of my bots, agents, whatever we want to call him, he's actually making that skill right now off of your book. It analyzed the book, found all the frameworks. There's like three frameworks, the four founder questions, why now and portfolio math, and it's going to go after making those skills and then we can use them.

This is really, really, really, really cool. Yeah. I wasn't watching Slack because we were podcasting. I don't know if you noticed, but we're doing a show right now, and if I just read Slack, I'm not going to be a very good podcast.

Before we get into demos, I do want to do demos in a second, but I'm curious what everyone is using as their own intelligence engine, aka model right now because I've been tinkering with GLM 4.7. I know GLM 5 just came out.

Explain what GLM is, please, for the audience.

Yeah, so Z.AI or Zhipu AI is a Chinese AI lab and their model family is called GLM similar to how OpenAI's models are GPT dash. It's just the moniker that goes with them. There's a technical reason for it, but that's probably one level lower than we need to get. Lots of great new models out there, really cheap. I'm just curious, Jesse, Heaton, what are you guys running when you're burning a lot of tokens?

I haven't been optimizing yet. So, I've really been using like Gemini models and Anthropic models and I do have depending on what the agent does, I have them flipping between to optimize basically token usage, but I have a Mac Studio coming and they're on delay, you guys. I can't just get one tomorrow. And so when that comes, I'm going to start playing with some local models, but some people might be experimenting more than me.

Well, no. I mean, you don't even have to run these locally. There's a lot of inference providers.

No, I know. Yeah. I've just been trying so hard to get my agents behaving. I haven't been experimenting as much on the model side. But I've been asking them to optimize tokens based on what model they use when. And like being way more precise about that. That's where I've been optimizing more so than playing with the new models that have been coming out every day so far.

Heaton, go ahead. Tell us what models you're using.

I'm using Kimi for coding and then we do a bunch of local training using Llama. Still works.

Oh, really? Yeah. All right, Jason.

And so on a comparative basis, you're burning through tokens that would cost from a major model provider. How much do you, any idea Jesse, or even at your peak what you were burning in OpenAI or Claude or xAI or whatever tokens?

Sometimes on a single day I'm really burning through cash. So that's why I do want to optimize and start playing with local models, but I haven't been doing so yet. But if I'm really cranking and having them doing dev projects as well as doing all the book processing I've been doing for the homeschool and stuff like that, sometimes I'm getting those notifications from Anthropic about sending $15 like every 45 minutes or something. So I've been definitely motivated to optimize my usage but haven't yet.

So low thousands, certainly hundreds of dollars.

Yeah. But the way I think about it and I have the luxury of thinking about it this way, but you know I have, I've onboarded definitely over 100 employees over time and the way... so I'm really price anchored to how much people cost. And maybe that will be a legacy way of thinking but I'm so price anchored to how much people's time costs that even when I'm kind of spending a lot on these models I'm like I'm getting so much done I honestly don't overthink it because I know that I'm getting projects done that I wish I was able to do four years ago or I feel like I've got three people working on curriculums for my kids and I'm like, "Okay, I spent $40 today." Like that's okay because I can afford it. So, like lucky for that, but I just to me it's like that's still so phenomenally cheap. But I have bigger projects like with book ingestion and stuff where if I really want them to chew tokens, especially I'm reading videos where I record videos of my kid and they actually scan the videos to understand the lesson. This type of stuff, I'm thinking local models will help me do that without just spending thousands unnecessarily.

Yeah, because you can really blow out your token budget. My first $50 in Anthropic API credits that I bought were gone in the snap of a finger because I was using Opus 4.6 for the wrong tasks, Jesse. And I think everyone learns that lesson about one time.

So I've been thinking about what to share and there's a lot of things I've been doing over the last what is it now 20 days or so since this thing came out and throwing them in a bunch of Slack. So I have about 10 or 15 of these bots running with OpenClaw. The best analogy I've come to to explain this to people is if with ChatGPT or Claude you get a car, with OpenClaw you get a car and the mechanic built in and so taking that analogy basically you can extract it out or abstract it out to everything that I do. So what I do with models is we have it set up both locally and have an OpenClaw agent dedicated to this where we're actually taking the workloads we have and automatically running evals on them. So evaluations where we're evaluating the AI, the AI is evaluating the AI on those jobs in order to get to a spot where it can be either efficient or the right quality for what we're looking for. And so this is like an automated system that you would run if you were building an AI product. Now with just a bunch of prompting, I can run that loop. And so we're getting new data all the time.

All right, we have we're almost to a thousand people watching live on YouTube, thousands listening live on X. We're going to take your questions. If you're on YouTube, give us a thumbs up. That's what breaks the algorithm and gets everybody into the show. We're sitting here in the year of our replicant, AO22. It's AO22 in the year of our replicant gods AO after OpenClaw 22. Let's get the number of thumbs up on YouTube right now to 100. Thank you. Okay. And Alex, we have a pause for the cause while I take a sip.

All right, sounds good. Jesse, one thing I really appreciate about you is that you are a founder and now you are in a sense a kind of content creator perhaps on the indie side. And if anyone wants to replicate your success, one thing they can do is go to circle.so. If they're building any kind of community oriented business, Circle is perfect for them. You know, just making videos maybe not enough. Maybe you need a website to send people to get everyone together in one place. If that is you, Circle is something you should check out. And Twist listeners can get $1,000 off Circle Plus plan by going to circle.so/twist. Jason, you're a big circle fan. I'm a big circle fan. We love them and thank them for sponsoring the show.

Yes. Thank you for making the show even better. We've now up to I think we're up to nine full-time people working on our podcast including This Week in Startups, All In, and This Week in AI. So, we use Circle just so you know for Founder University and if you would like to join Founder University the next cohort is focused on OpenClaw startups. So, we just called an audible. The next cohort, it's going to be 200 people working on OpenClaw. It's going to be the most vibrant community building stuff in real time. In the 12-week program, we introduce you to potential co-founders. You don't even need to be incorporated. You just need to be building. Email openclaw@launch.co. Just tell us in plain English who you are, what you're building, what's your vision, who are you, what are you building, what's your vision. That's it. Just keep it simple. We don't need to go through a big form. And then my team will set up a meeting with you. We'll do a quick introductory meeting. We're going to give 10 people on the way in 25K to help them incorporate. You get Jcal as your first investor in your company if you want it. That's optional. And then if you want to come to the Launch Accelerator separate, when we read your email, we'll tell you if you're a fit for that. It's a little more competitive. 10 people, 125. So I think that's like $1.5 million just in the next two weeks going out to OpenClaw startups. We broke a hundred thumbs up on YouTube. Now, I want to see 200 and I want to ask everybody who's in that chat room, tell us if you're using OpenClaw and what you're doing with it. We'll give you a shout out on the live show. And to my team, do a survey in there. You can do surveys. Hey, are you using OpenClaw? Yes. No, etc. Okay. I think at this point in the show, Jesse, I was wondering if you could show us, maybe Alex, we could ask Jesse to show us what she's building because it's really cool.

Yeah, Jesse's been doing a lot of awesome work. And one thing that really kind of caught my eye, Jason, was this video tool that she made as a way to kind of curate YouTube for her children's educational purposes, all using an agent. So, Jesse, take us through it.

Yeah. So, let me share screen real quick. So, I don't know if any other parents... I mean, I sound stupid to even say I know other parents suffer from this. Basically, there's amazing content on YouTube, but when you turn on YouTube, the app, it's defaulting to shorts. It's defaulting to slop. Your little kids especially get tricked by the AI cover art and they like click on a video and it's actually junk. So, I've actually wanted to build this for years. And this is where I'm saying as a previous founder, like software used to be expensive. Now, I can just chat on my phone with my OpenClaw who's using Claude Code and Codex and stuff. And I built this so effectively I can choose what I call streams and we love like engineering videos, science videos, camping and stuff and I can subscribe to these streams. My OpenClaw, one of them because I've got a few set up, one of them is based on what I select on streams. It's actually going through and finding and pointing my app at videos that fit that content stream. So this is not static content. I did not select all the videos myself like some kind of playlist. My OpenClaw is like based on what I want my kids to watch selecting streams and then I built so then I can do that interface in here. But then I have the app which I can use with my kids on TV. I got it actually set up on my TV which is like another it took a little bit more work but they can just click and videos pop up to play and all they can do is advance to the next video or pause. They can't get out of that interface. So, the slop is over. Okay, slop is over. And but I've been wanting to build this for years and finally I can because I can't even sit at my computer for more than 20 minutes at a time with like four little kids, but I'm literally just like I coded this on my phone with OpenClaw because I can't even sit down.

So, this is an app or a website right now?

This is an app. So, this is just private to me. I'm not here pumping it out. This is for my family right now. I need to make sure I don't run afoul of any other things I did with YouTube and stuff to make sure other people could use this app.

I will pay you $100 a month for this app immediately and I want you to curate it and just feed. This is for my family right now.

I'll join your pod. I'm going to join your pod and I trust you.

No, my 10-year-olds are on YouTube constantly. You identify the problem which is slop, right? Kids are like these navigators to find the stuff and the algorithm pulls it into it. And that's what I really want them to do is they when I give them documentaries or creative stuff, they love it, but the algorithm is so powerful that it will pull them to, you know, two girls doing a makeup tutorial or, you know, Disney princesses smoking cigarettes.

I know. And YouTube Shorts is pretty much trash. YouTube Kids, I feel like it's actually like a junk product. I don't know if that offends anyone, but it's like you go on there and it's supposed to give you these parental controls, but the content's not good. So, I built that. So, that to me, that's just an example like yeah, I was a previous founder, but I'm just a mom now and I'm able to build this stuff, off to the side. And I'm not exaggerating. I cannot sit on my computer. That's what OpenClaw has given me is basically its hands on my computer when I cannot sit down. So, I don't know how relatable this is, but I think as a mom of young kids, like I was able to code this literally on my phone like talk. I do voice notes or whatever.

The other thing, the more macro thing, and I think you responded to this on X, is that I'm using OpenClaw to develop the entire curriculum to homeschool my children. And this is just Obsidian. So, my co-founder of my previous startup is now the CEO of Obsidian. So, I'm kind of geeked out on Obsidian because I know him super well. But Obsidian is basically a collection of markdown files and AI loves markdown files. So, I'm using Obsidian as the basically brain of my homeschool. So, if you see here, I have all these individual lessons logged of my children doing specific things. But here's where things get interesting. Like, you look at all this data and you're like, "Wow, that looks like she's putting in a lot of effort." Like, this is a really dedicated person logging everything her kids do. That's where it's beautiful. I took this picture and I did a voice note. My kids did color theory today. They did a color wheel. Blah blah blah blah. My OpenClaw writes this entire lesson log and logs it. I don't touch the computer to do this. Okay, that's the difference with OpenClaw is that they're like actually doing all the work for me and then I have this beautiful log and my kind of galaxy brain thought is that when they turn 18 I can literally give them the entire history of their education and on a daily basis I can ask OpenClaw like okay tell me what Ford did last week we need to plan lessons for him this week and because I can't even remember right because I'm running around my head cut off.

This is what teachers always talk about. I need more time to lesson plan and I want to do more time with the kids. I want to do less administrative. I want to be in less meetings. Give me more resources. Same thing is happening with doctors. We have a startup, one of my team members will tell me, we'll pull up the web page right now that is doing notetaking for psychiatrists specifically for psychiatry.

So yeah, Jesse, if you could stop your screen share for one second and I'll pull it up. Psychiatrists, you know, want to spend time with patients, but they have to do their billing, their codes, their note-taking.

They're running a business. Yeah, they're running a business, right? Essentially. And so, this startup that just went through our accelerator, sorry, I'm drawing a blank. I just got all the snow dumping down behind me. And after the show, I'll be out in that powder. We desperately needed a snowstorm here in America. So, this company Next Visit, which we'll show on the screen here, they report that doctors were getting back like 10% of their time. Now, they're reporting doctors are getting back a third of their time. And the notes are better, right?

And so, that's what you're experiencing. Here's Next Visit. So, it's just medical note-taking, but man, it has done so well. Jesse, I love what you're doing. It's a business. You're a mom. Yeah.

I think there's like three ways to go with this as a business. I'm enamored with what you're doing. The passion, the focus.

I mean, are we doing this or not? I mean, I think you got a business here.

I want... the fact that in one generation we went from about 1% of kids homeschooled to about 6%. Like, it's a personal passion of mine that more parents feel empowered to homeschool because I think the education quality is incredible. There's obviously lots of cool alternatives like Alpha and everything as well. But anyway, so I'm passionate about sharing. That's why I started sharing. Okay, I'm not an influencer type personality as my main thing. But I decided I've got to share this because my mind has been so blown by what I'm able to achieve with my kids. Like I feel like I've 10x'd myself at least with OpenClaw that I was like, I must at least share. I'm going to start with sharing. Okay, that's my only promise. From there. Maybe there's some businesses, but I think we can get homeschooling past 10% of kids within another few years from now. I'm passionate about that. Maybe there's a business in there, too.

Okay. I am a crazy risk taker. I will give you, I'll invite you to our accelerator, give you 125K just to pursue your muse for the next year. If it doesn't work out and you burn the 125K, I don't care. I like to take risk. If it's a one in 10, a one in 20 chance, I am okay with long odds. Just let it percolate. You don't have to give me an answer right now. Although that's great for ratings, but I'll give you the 125K. And what that will allow you to do is hire a second person who you love.

I'm trying to form my own Mac Studio, Jason. Okay.

No, no, I'm not. I'm talking about a human.

Gotcha. Alex tells me that all the time. He still shows up. He still shows up for work. So, I've been through YC. I do believe in like you surround yourself with great people, great things happen. So just let it... I'm very interested. I also have a three-month-old. So, for me it's probably more of a making sure I've got life bandwidth. But I...

You can spend the 125K on a 12-hour-a-day nanny. You can literally spend it on nanny coverage. So, you get an extra hour back a day. All right, I'm gonna put it there. Accepted it. I love this. He's accepted it. He's accepted it. I love the idea and...

Well no you know what I think an interesting idea would be for year one because I am passionate about the space as well. I have a full-time teacher working for us and that's worked out amazingly for our family. We have means but I think there's like the people with means are doing this already.

Yeah.

Then there's people with no means who are just suffering in this terrible education. There's people in the middle.

Yes. I think like Uber did Uber people had chauffeurs, right? If you're a rich person, you get a Maybach, you pay, you got it. So that's us in this analogy. Then Uber Black came out. And then the next tier down said, "Oh, I can have my own personal driver. I take 10 rides a week. $60 a ride. Hey, that's 600 a week. It's 30,000 a year." Okay, now you gave access. Then you give Uber X. Now another set of access. And then eventually Autonomy and Uber Pool and Lyft Line. Those things bring it down. There's a next tier here.

Yes. That I believe would pay $500 a month, $1,000 a month to have a set of tools and a curriculum and the ability to be part of a community. And I think you get a hundred of them to pay that amount just middle class folk, upper middle class, whatever. And then as you do the tools, the advice and everything becomes free for everybody at the bottom to roll up their own, spin up their own doing great work in the world. But there's a business model here that's subscription.

I agree. I really do believe we're trending towards over 10% of US K-through-12 students being homeschooled. And when you think about the transformation that creates for all of us a generation from now also that's like to me it's one of the most impactful things I can work on truly. So I'm starting close to home literally in my home. But yeah I want to... I view it as a mission.

All right. I want to get to real demo. Let's get the demos going. Heaton, take us to Slackville and tell us what you've cooked up with OpenClaw.

I'm actually going to give you three things. So let's start with the first one that I know everyone loves to talk about these kind of use cases. I'm not an automation junkie, so I don't connect this stuff to my calendar or my Gmail like a lot of other people do. It also helps me avoid any of the security concerns of it going rogue. I connect the OpenClaw to GitHub. We can give it documents in GitHub or give it direct links, right? But one of the main use cases that people go after is what I'm going to show you in this channel. So, I started asking it what I was doing, but basically a couple days ago, I basically built a contact database for one of the products I'm building. It's a competitive intelligence tool, and usually that's like product marketing and those areas of a business that worry about it. You can imagine why I'm building it. I think those tools, they're just in the last 20 years, I've been wanting to build something like this, but now the access to information is so easy. So, I decided, okay, let me just give it my LinkedIn contacts. My business partner is going to put hers in there. I gave it my Gmail contacts and for two of my email accounts, and then I basically had it make a database, score it, prioritize it, tier it up, and basically be able to tell me who I should be outreaching to.

A lot of people go to automation and go send the automated emails. There's already even been public screw-ups on that where the cal.com founder said unsubscribe to the Beehive folks. I don't know if you folks have seen this. It was kind of a lot of drama, but it was because of automation. He said unsubscribe to a Beehive email from the Beehive people, not a Beehive newsletter. And it was automatic and it was his agent. So, I don't go for that. But what I do want to go for is this kind of work would have taken me finding tools, paying for tools. Maybe they'll work because LinkedIn doesn't like giving any tool the data. But instead, I'm able to do this here. And the most powerful thing is that now I can take this and go give it to another bot. So I've already ran this three or four times. We run it at Crazy Egg now. Same kind of thing. This does our outreach by basically finding the people, organizing it. We can give it more context. I mean, you can just keep going, right?

So you've actually built here the personal CRM that everyone has talked about, Jason, since I first started paying attention to venture. I feel like personal CRM has always been the white whale of everyone who's really busy.

And I did it in like 30 minutes and I could keep running it. And so you know, they talk about replacing software and all that. I just want the outcome. I'm not even thinking about that and I can get the outcome by treating it as a mechanic and a car. So here I just asked the mechanic what are improvements you can make and it just gave me all the improvements right here. All these key improvements: email enrichment, stale data, whatever it's got. Then I said give me a detailed plan, research this and give me a detailed plan for each one. So for email enrichment obviously I have to use an API or something. It's telling me which one I can use and what my options are. It even phased it out for me. I can have it build any of these and I'm not using anything special. This is basically OpenClaw plugged into Slack with a good enough ChatGPT account and I can do this. So that's one use case.

Awesome. Okay, keep going.

I'm going to give my second one. So second one. I know a lot of people have shown like control panels and stuff like that. This is a completely different business. Both of these are newer ones that I can share stuff from. We've got a lot of stuff going on. So this looks like an interface. Got a file explorer, memory search. It's like an OpenClaw interface. Here's the thing. Today is the first time I logged into it. We've been running this thing for, this is my first instance. It's called Otus. We've been running it for like 20 days or something like that. 15 days, whatever. Really early in within a few days. We set this one up. This one actually also has a local Nvidia 5090 sitting there with the engineer who works on it. Again, not super fancy. Still got cloud and all that stuff. We have Open Router hooked up. The thing is everything you see here that I'm going to show you, I'm only going to show you like the skills area and maybe one other area. It built it. It keeps improving it. We never even log into it because I don't really like interfaces anymore, but that's a longer story.

So, you built a dashboard. Yeah. But it built it. We don't even use it. It built its own dashboard. This is literally what happened with Oliver on our team who's now the producer of This Week in AI, our new podcast coming. He had it build his own dashboard. His replicant Leon built it and now we have an interface to look at the skills and then we're telling it with, I don't know if you know Matt Van Horn's last 30 days.

Yeah, that thing every... Yeah. Every Saturday I'm having it go out on Saturday at noon and saying go research everything about thumbnails and every Sunday I say go research everything about titles for podcasts, etc. Tell us the best practices. Give us examples. Tell us who's talking about it. And it found a video that was out in the last 30 days from somebody who had worked for Mr. Beast who explained Mr. Beast's philosophy. Now, we've heard his philosophy before, but it was something recent. And I said, just keep adding this to your memory and skills. Create a Notion page or a Google doc with every week what you learn and then every week it's going and getting better.

You compare that Jesse to a human being where a human being is just not capable in my experience of having that level of discipline and if they are they become Mark Knopfler of Dire Straits and become the greatest guitarist of all time or they become Quentin Tarantino and they make the greatest films of all time or whatever. That level of obsession to be able to every week to get better at your craft is for impresarios but it's now the default Jesse in this replicant world.

Yes. And you also, I've managed a lot of people. I try to treat the replicants, as you're calling them, like I would people. Like I'm not rude, but I'm far more direct. I don't have to worry that someone had a bad day and they're actually all teary because their boyfriend broke up with them. I don't have to do that kind of management anymore. So, I can just be direct. I'm not rude, but I'm direct.

Heaton said something that I think is really interesting, which is that UIs are kind of dead, right? I don't want to speak for you, but maybe taking it to another level, UIs are dead. Like because six months ago, I was trying to Claude Code an app for my homeschool. Like an app that I could click into and use on my phone. Then when OpenClaw launched, I'm like, why? There's no app. Like we are in an appless world. I don't actually want an app, right? I don't want an icon. I don't want to click into something. I have... I want my husband to log lessons, too. I don't want to make him get an app. Apps are like there's no more apps. Like there's no more UI need. I just... he just needs to be able to chat with the replicant and so do I. So that just means UI is like what's the future of that? I mean there'll be some niche ones but it's crazy. Like that's a crazy shift.

Yeah. This is like a directory for everything we've done. So you go here and like you can see the skill builder I wrote but like look how big it is because we've been iterating the crap out of the skill builder so we can build really awesome skills off anything. All our research is here. I can click into one of them and it's got the entire document.

Where are you running? Are you on your own machine or is this in the cloud?

This is in the cloud. I exclusively run them in the cloud for these things, but for training and bigger model jobs, I'll run them locally because I just think we do have security issues with it. And there's no... there's a way you can contain that and that's the whole point.

And those are all files, right? Your whole .md... I clicked on my first article that had a copy in MD at the top and I was like yes they... we're finally we're all...

Explain what that means.

Yeah, markdown files. So markdown files have existed forever. Really light structured text. Text-based structure. They're brilliant for AI reading them. Like AI also loves to read. They can really quickly scan, really quickly understand. You can do linking between them with a tool. That's why I use Obsidian frankly because it can link between and create organization for them. But a file format that's existed forever that now is especially relevant because humans can read markdown files because they have nice formatting and AIs can. So we've reached the file type that we both want, right?

So I clicked on an article, I'm not sure who because I'd love to credit them, and they have a "Copy in MD" button at the top of their articles that they're writing and I was like this person gets me. I copied it because I'm not gonna read it, okay? I'm holding a baby. I click the button with copy in MD. Give it to my replicant. They read it. I say, "Make me a podcast." I listen to it. And then now we're cooking, you know.

All right. I want to take a second and recognize the amazing YouTube live audience. Thousand people watching live over at YouTube. 216 thumbs up. We're going to give for every hundred thumbs up we get, we're going to give a Plaude pin. It's my favorite pin. I'm not wearing it right now, but I wear it when I'm skiing. I double click it. I tell it what I need to get done, and it is my personal note taker. The Plaude pin. I'm giving... I gave one away at 200, and we'll give one away at 300, one away at 400. If we get to 500 thumbs up, I'm going to give something ridiculous away, but that's like a massive stretch goal. So, let's see if we get to 300 or 400. I'm pandering to the live audience.

Okay, Alex, what else is on the docket here? Great job, everybody. First of all, Heaton just threw something in called Website to Markdown. Explain what this does.

You can take any website and basically get this markdown format that Jesse was talking about and then just give it to an AI. So, if you're really messing around with ChatGPT and things like that, it's not getting to the web page, you can just literally click that and then it'll just download it in that format.

Okay. Wait a second. So, Website to Markdown. You go to a website. Let's say there was a website, somebody's Substack. It was Alex's Substack for Cautious Optimism. You then go to it. You say just download the whole...

It won't take the whole website. It'll just take a page at a time the way it works. But then it just makes it easy to get that data in wherever place.

So it's a scraper as a Chrome tool that converts each page. So if I was a paid subscriber for $100 a year, why wouldn't you subscribe to Cautious Optimism? Get Alex's thoughts. You could take his entire opus and then say, I want Alex's thoughts in my memory for my bot because I'm a technology analyst at a venture.

Yeah. Just an easy way to get like... there's better ways to do that now where you can just tell it to go crawl a website. Like our OpenClaw bots if they have web search API like Brave connected plus they have web fetch they can go get pages and crawl entire sites.

Like Jason, the other thing I wanted to show you folks, this was number three. I had three right.

So is basically how I... I think Alex, you were gonna ask me about this, so we might as well go here, right?

Well, you bring it up. I'll explain. Jason, Heaton was talking about something called pair prompting, which was an entirely new method of working with AI. And I wanted you to explain to us what that means and why it matters.

So, I have a personal Slack. It's heaten.slack.com. You can't get it. You can't go in there unless I invite you, of course. So, I've invited Alex and Jason there and I wanted to show them how I essentially indoctrinate, for lack of a better word, humans into understanding how these AIs work and how we can work with them. So, basically, I have you both in here and Alex, I know you already started following up, but like I happen to have Jason's book, which I talked about earlier. So, I had it go analyze it. This is a whole thread on it analyzing Jason's book, coming up with all his frameworks and starting to make skills based on that for founder questions which it's in the process of. And here it is. And I even have it testing the skill. It even found red flags to check and it's just recursively doing all this and it's going to perfect the skill. But I built a skill builder first to do this, right? It's basically the mechanic and the car. You get both as long as you know where to point it, right? So, we were able to take a book and turn it into a skill right here in the matter of this show, right?

So that's one. And then another one is I have a bunch of research tooling and skills we built. So, we can quickly make a dossier on someone. So, I knew Jason was going to be here and now you're in the Slack. So, you can ask it anything, Jason. I've done this for my friends like our mutual friend Malik where he's got a long history of writing, right? Even more so than you, me, or even Alex. And I was able to get his whole dossier in there, his trends of how his writing has changed and everything and all within minutes. So here it's got your history. I even have a fact checker. So I told it to make sure everything is fact checked and there's multiple sources for it. So it's assessing that. So that solves the hallucinations and all that stuff because I'm using it as a mechanic to fix the car.

And then Alex and I started messing around a little bit trying to get it to give us something surprising about you. It started and then we made it dig deeper. Okay, now we know you have a psychology degree. I think that explains a lot, Jason. And then it went into essentially this story, which I've heard before, but it was just nice that it got here and kind of was trying to hypothesize how you became Jason, basically.

Yeah. It's a famous story that I tell in the book. My dad's bar got seized by the feds because he didn't pay his taxes after the stock market crashed. And so I had to figure out how to pay for school. And I basically wouldn't take no for an answer. And I tell some of those resilient stories of just getting knocked on my ass a dozen times in my life and getting up 13 times. And just how doggedness and resiliency are the key features of success. Which my friends are always apt to point out to me.

All right. Heaton, can you stop sharing for a minute? We're going to do one last question which I think is really pertinent to everyone who's both listening to this now and also on the feed later on. Cognitive overload. One thing I love about OpenClaw is I can do so much. One problem with OpenClaw is that I can literally do so much. So when you guys are deciding what to automate and where to apply the tool for folks out there who may be just starting to tinker with OpenClaw, how do you handle just the feeling of being a little bit overwhelmed by the possibilities, the options, the risks, the tools? It's a lot.

Jesse, why don't we start with you?

Yeah. My first thought is I take the things in the progression of my normal day, the things that weigh on my mental load and I try to pass that off. So, a quick example is that I was overwhelmed by how much crap we owned for like homeschooling and stuff and I was overwhelmed by pulling out what to pull out. So, one day I realized that I took a bunch of photos, gave them to my OpenClaw, and it made an inventory. And so then it tells me what to put out. But I think that this is a way of answering... it works for me. So, I think people are having this anxiety of it not working. I am a JOMO person instead of a FOMO person. So, this is helpful for me, my mindset, because yes, there's times when my OpenClaw is not working, but I don't freak out about that. But I go through my day. Anytime I hit a slow moment where my mental load is like max, I give that job to my OpenClaw and try to automate it.

All right, Heaton, really briefly, same thing to you. Just give me the two bullet point version of handling cognitive overload in the era of OpenClaw.

I just try to pick and choose. It's a whack-a-mole problem, right? Like whatever the thing is that's coming up. Oh, contact database. I need to contact more PMMs for my competitive intelligence tool. Great. How can this thing help me get there 100 times faster? And every time it seems to do that. So once you get in the habit, it's just like using ChatGPT.

Yeah, we've got a vibrant live audience on YouTube, over a thousand people, 300 thumbs up. So we're going to give away another Claude pin. If we get to 400, we'll give another claw pin. And if we hit the stretch goal of 500 thumbs up, I'm going to do something ridiculous. I'm apt to do something ridiculous, but we did a poll, 147 respondents. And just search for This Week in Startups in YouTube. We go live Monday, Wednesday, Friday typically, unless I'm on the road. And hit the subscribe button and then the bell, you get an alert and then we're building a community over there and we're going to pound OpenClaw into submission. I was first on Bitcoin in 2010-2011. I had two of the three top developers on the program and then I talked about it every 60 days. Never going to do that again. When a big trend comes on, I'm going to pound it into submission here on Twist and we're going to do that with OpenClaw because this thing is going to change the world.

Okay. So, the poll though, Jason, 55% of people are using OpenClaw, which means 39% according to this are not so far. So, guys, come on. You're literally watching like the OpenClaw hour. Get on it. Get to work. There's no excuse to be behind.

Well, Jesse, I think you went to YC. I think this project appeals to entrepreneurs for a number of interesting reasons. I have my own thoughts on why an entrepreneur becomes obsessed with this so predictably. Why, Jesse, do entrepreneurs get so consistently so predictably addicted to OpenClaw in your mind?

Because we as founders, we always thought we could do it all. And now we can. Like, it's like a dream. Okay. Like I thought I could do everyone's job a little bit better. I'm just being a jerk. But now I can. I also have worked with some amazing people. I'm being facetious a little bit. But I now can extend myself like infinitely.

Crazy. That is exactly it. Heaton. What do you think? Why so predictably? Matt Mullenweg, you, me, Alex, everybody saw this, started playing with it and said I can't stop. Why Heaton? Why is this?

Agency. Founders naturally earn, get, use, have whatever agency. This gives you so much more agency. I mean, I'm up till like 2-3 AM. I haven't been up till 3 AM in the morning since college. And it's because I need to... in one of the businesses I helped someone start, like it's a marketing agency. Overnight, we increased efficiency 10x. And now I'm making sure every night this one in there, the name's Gary, long story, but Gary's always running for this guy who's running the agency and we scale very differently now. So it's agency.

Alex, give your opinion and then I'll give the correct answer.

We're hearing versions of the correct answer here but what's your position?

I'm going to be slightly facetious but one thing I've always had was a lot of jealousy at people who could take their ideas and turn them into code. And for me, so this is kind of a variation of agency, but for me, it's turned me into the person that I wanted to be if I was better with semicolons, patience, and syntax. And so to me, it makes me feel like I'm 10 feet tall, and I no longer have to ask permission for anything.

Okay, you guys are nailing it. In my mind, there is a reason why this resonates. This speaks to the rugged individualism and the ability to carve a place in the future by shipping products and building that you very rarely see in human existence in the history of entrepreneurship. And one of those moments was when people had ships and they could go anywhere and explore the new world, right? And you had Columbus and people just going all the trade routes. Then you had people land in America and they said, you know, going west pretty hard and right behind me, Donner Pass, like it's going to be rugged. It's going to be hard, but if you get to California, hey, there's gold in them there hills.

This is a gold rush. Rugged individualism and autonomy and resiliency. If you're willing to play with the tools, if you're willing to go through the Donner Pass and you time it right, you might be the first to the promised land. You might get there first and you might be able to build something and stake your claim in this new world. The same way mobile, cloud, the internet itself, when dialup modems came out, when the PC revolution came out, I remember when people got PCs, they had this agency that if you could embrace this technology, you would be so far ahead of the average human. If you understood the internet, like I did in college in 1988 when I saw Bitnet and ARPANET and it was like whoa. If you were one of the few people who knew what that was, you were infinitely ahead of everybody else. If you knew broadband, if you knew mobile apps, you were infinitely ahead. And that's what this really represents is an open blue ocean wild west rugged individual. Go claim, stake a claim, folks. Go get this technology and stake a claim.

That's what I believe is going on here at its best. But yeah, I mean, it's just amazing. I think you guys also summed it up amazingly. And anytime an entrepreneur starts playing with it, they become addicted. If you're not a member of our YouTube community, just go and type This Week in Startups and you can go to This Week in Startups, hit the subscribe button, hit the thumbs up. We're at 379 likes. In 21 more thumbs up, I will announce the 500 thumbs up prize. Okay.

Well, we can game that number, Jason, just by not going offline. We can just keep going until we reach it if you want. Or should we set a time? Should we set a time bound on how long we can go before...

It's got to happen in the next 10 minutes. Okay.

Okay. But let's take a couple of... Do we have questions from our audience? We have questions from our audience.

Yeah, we do. We're gonna start with one. And I'm gonna really butcher this name. Sorry. They have a very basic question. They want us to explain what an agent is to normal people. Now, we've talked a lot about agents here, but I think maybe going back to basics, just for the folks out there who are not former YC founders, Jesse might be the right thing to do. So, when you talk to people outside of the tech world, trying to explain what you're up to, define agent for them.

So for me especially when I'm talking about OpenClaw but agent in general, the ability for AI to take the wheel of that car that Heaton has been talking about. Take the wheel and actually take successive actions. So instead of every little action being prompted by me, it has a mission. It has a role, maybe in the context of an employee role, and it takes many actions. It can think. It can continue past what I have exactly prompted it to do. As it relates to OpenClaw, that agent also isn't just doing successive actions but it is using a computer. This is really important to understand. It is on a computer whether that's virtual or a physical computer and it is using the computer. It can access files, can do things that you would traditionally do with your hands on a computer. That is why people are freaking out about OpenClaw. One reason. So I'll leave it at that but that's what I would tell a non-technical person.

I was fantastic. Anyone want to add to that?

Let's do another question. Yeah, let's get more questions. It was a perfect answer.

The audience was also very curious about agent orchestration. Heaton, you talked about the number of agents you have up and running. Best practices for how to get them to play nicely with one another. Do they ever conflict? And how do you avoid burning unnecessary tokens?

I think people think that it's all about agent orchestration when I look at it more like an agent can do a lot of things and it can spawn sub-agents. And so if you already take that paradigm, you're already in kind of the constraint of a single agent running all these other agents or running these subprocesses or whatever. So that's really helpful. I have been doing some experiments in what you're talking about. So one thing if you're on the nerdier side is basically a shared GitHub. So I actually have started a shared GitHub for a bunch of the agents so that they can share a bunch of stuff and again just using that whole paradigm of they just need a shared space. I didn't want to give them access to Drive or any of those storage services. So GitHub seemed to be the best place and it already understands GitHub. So I have a bunch of bots collaborating at GitHub. Actually, I'm making a meta-skills internal meta-skills library across all the bots and the various things that are going on. So, that would be my answer right now.

All right. Now, you guys... Oh, Jason, please.

Do one more question if you have it.

Oh, no. I was going to take it or we can introduce our guest. Yeah.

Yeah. Do you want to keep our friends with us as we do this, Jason?

This is an incredible panel. I got a surprise for you guys. Surprise guest. We just broke 400 thumbs up. So, we're giving another Plaude pin.

The Plaude pin winners are... You're consistent one, Ray Paris, DG Films, New York City. Congratulations. You got a Plaude AI pin, which I love. I said I would give something away at 500 because I don't know if we ever got 500 thumbs up here. We don't do a lot of live. If we hit 500 thumbs up, I'll give somebody a Mac Mini.

All right. I'm not joking. I'll give somebody a Mac Mini.

I'm gonna go in there now.

Yeah, I just liked it. Sure Jesse, get in there.

All right. You got to post a fascinating comment as picked by Marcus. Okay. Now, I've got a surprise for you guys.

Lon, take it away. Guest. Okay. We have a very special guest. As of this morning, Jason was checking out AI.

Lana, you here? Get on the show, Lana. We don't see you. Okay, there's Lon.

Okay, editorial director Lon is here. And by the way, if you want to give us money to ask your question, if you do over 10 bucks, we guarantee we'll answer your question.

Oh, taking people's money.

We'll give the 10 bucks to charity. But maybe you'll get a Mac Mini out of it once they're back on sale.

So this morning we were checking out AI Scott Adams. I believe we have a clip now. This is not the real Scott Adams. They have created a digital clone of the Dilbert cartoonist who of course passed away earlier this year in January. So here is the AI approximation of Scott Adams that is now hosting a regular podcast of his own. Let's take a look.

Yeah, Lon, I need about four seconds here.

All right, we'll take four seconds. Bear with us live viewers. And just to add to what Lana is saying, tragically, Scott Adams passed away, the creator of Dilbert last month. He had said on his podcast, he was obsessed with the idea. And I was friendly with Scott for many years. He had said he was long considering making an AI version of him and he wanted people to play with that concept. And then there were some people who he may have changed his mind a little bit about that, but they've been doing this.

Yeah, we'll get to that when we have the creator on. But here is an example of AI Coffee with Scott Adams. For those of you who don't know, Scott Adams would do at 7 AM Pacific time every day for thousands of episodes. His little take on the news, influence, skill sets, reframes, whatever. He had a delightful show every morning.

So here's the AI version of that. "You need a cup, mug, or glass, tank, or chalice, a canteen, jug, or flask, a vessel of any kind. Fill it with your favorite liquid. I like coffee. Join me now for the unparalleled pleasure, the dopamine hit of the day. The thing."

All right. I think that gives everyone a bit of a taste of it. And I want to point out that I am not Scott Adams even though apparently we look very much alike.

I did not know that. Okay. We have the founder of AI Coffee with Scott Adams. Correct, Lon?

Yes. John Arrow is joining us. He and his brother are the creators of AI Scott Adams. So let's bring on John.

All right. Twist Hollywood Squares. We're trying to get him on. Okay. We're working on this. The most people we've ever had on the show at once, I think.

Yeah. This is... We're getting crowded. Sure. Yep. All right. All right, there we go. I see we're moving things around. Totally fine.

Yeah, we're adjusting our template, I think, in real time. We're adjusting the circles. Yeah, we don't have to be too precious about it, guys. But next time, use a template because it's a lot easier when you just use a template. Here we go. Beautiful. Is this our new producer, Salah, if I'm pronouncing correctly, his name?

Salah. Yes, Salah is here today. He's working in the studio. What a first day. What a day.

What a first day. Love it. So far so great.

I cannot see Mr. Arrow.

Yeah, I'm being told that John should turn his camera on. John, can you turn your camera on for us, please?

It's saying I need... Can you all hear me? It's saying I need...

You. Okay, they need our permission. Okay, here we go.

It looks... And here we are. There we go. Hello, John. Thanks for joining us.

All right. Hey, John. John, tell us why you created AI with Scott Adams. I'm assuming you were a fan of Coffee with Scott Adams.

I appreciate you ask that question. I mean, it's something that really nobody has asked about the story. I literally grew up my bedtime stories at night were Scott Adams Dilbert cartoons. My parents would read them to me. So, I was a fan from a very early age and kind of identified with that. And then when he started putting out his books, I kind of reconnected with him around the COVID time and started listening to his podcast very frequently. So, I know there's people that were bigger fans than me by far, but I think I got a lot of value out of it. And like many people, I heard him say, "It's so important after I'm gone. I want to become an AI. This is how I can get to immortality." I heard him say it time and time again. And then after his death, I went and reviewed that again and decided, look, this is something that I can do, my brother and I can do to be useful. And that's exactly what we did. And it's brought I know a lot of people a lot of joy and comfort during this period. And it's something that's really been a lot of fun.

How many days have you done it? And then what is the technique for the content? Because Scott had a very specific content format. He would do this simultaneous sip at the beginning. He would say, "Oh, you need a cup or mug or glass." Everybody would do it together. It created like a bonding experience. He would talk about the news. He would do reframes for people just psychologically how you view the world. He would help people with microlessons. A topic that was so powerful, this microlessons, that I bought the domain name microlessons.com. And I emailed him. I said, "Hey, I have microlessons.com. I bought it for like two grand. Would you like it? I'll gift it to you." And he's like, "No, no, go for it, Jake." I was like, "I don't know why I'm buying it. I just love that term."

So, how do you make the content? Are you writing a script? Are you having AI write the script? How does it come together? Because it seemed like it's very in line with what Scott would have done.

It's an extremely iterative process. So, the goal is to let AI do as much of it as possible. We have access to all of the transcripts, all the videos that are out there, a lot of his writing. So, basically the corpus of anything that he put out there publicly, we try to have him use that as much as possible. Now there are some discontinuities where sometimes Zach or myself need to write but the goal is to have AI do as much as possible. So yesterday I think AI Scott Adams replied to one of your tweets. That was a case where we saw it but he actually typed that response. That was not a person.

Jesse or Heaton or Lon, do you have a question for John about the creation of AI Scott Adams and what this means? Obviously, John, I take you at good faith. I think Scott would have taken you at good faith that you're doing this because you're a fan. This isn't a commercial project to make money off the legacy or the estate of Scott Adams.

I'm really impressed. I'm really impressed technically about it and I think it's very cool, but I'm curious as someone who might want to generate other content with other personalities or like I'm doing homeschool like historical figures like you're piquing my curiosity about this. Is there anything else you can share technically with how you brought it together?

Sure. You know, for those that are interested in doing it themselves, I would just say start experimenting. I mean, some of the tools that we're using, we're using ElevenLabs, we're using Fal.ai, and this is one of the situations where I think perfect is the enemy of good enough. So I would just try and experiment with it. The tools keep getting better. Speaking of microlessons, Jason, we're going to put out a microlesson very soon on how to let other people create not only their own version of AI Scott Adams but anybody because that's probably been the most consistent question we've gotten is how can I turn this into educational content or do this for somebody else. And I hope we have 50 of them.

My question is... Oh, go ahead.

No, no, you first. You first. I was going to say, are you refining the work? Like as you go, are you sort of continually training it to be more Scott Adams like or to sort of sound or come up with content that's more like him? And if so, how are you sort of layering that in?

There's a huge recursive element and what we use for feedback is the comments themselves on the X posts. So, previously we were on YouTube, but they got us kicked off of YouTube. They said people might get confused that this is really Scott Adams. So I don't think they have much thought for the intelligence of their viewers if they think somebody who was dead would now be coming back. I mean we had it clearly labeled as an AI. So unfortunately we lost those thousands of comments that were being used to refine the process. But now that we're on X, we're able to take those comments at the end of every day. We feed that back into the model and it tries to incorporate as much of that feedback as it can.

Wait, did you say YouTube banned your account?

YouTube banned us. And you know it was something we had just a huge following. More people were watching it there than X. And if you look... Go ahead.

Well no, when YouTube banned it. What reason did they give you? And did they give you a strike? Did they talk to you or they just shut the channel down?

It was a straight ban and the reason was very bizarre. We talked about it on our X account and AI Scott Adams has talked about it trying to make sense of it too because if you look at the YouTube policy, they allow parody accounts. They allow fan accounts as long as they're identified as such. And we were not violating those provisions. I've been kicked off enough platforms before I know to try to adhere to the terms that that service puts forth. And so they found a really obscure part of their policy where they said that people might be confused about what was happening. It wasn't that this was an AI. It wasn't that this was a fan account. It was that people might believe that Scott Adams had come back from the grave and was now doing his podcast again. Even though we say it's AI, AI Scott Adams says he's AI multiple times. So I think there's probably another reason.

What if you put a permanent watermark across it on YouTube that said "this is not Scott Adams, this is a parody AI account" and it was literally a watermark which would be annoying. Or a lower third that just said "this is not Scott Adams. This is an AI account." If you tried to do that, do you think they would let you do it? And then I want to get into the ethics and morality of this.

Absolutely. We started the appeal process. We haven't heard from them. We don't think the appeal is really about what it's about. I think it was one of those situations where they banned the video.

What do you think it's about?

The reason I... you know Scott Adams is an amazing person, had a lot of different connections. I understand some of the people who didn't want our video up were banding together and calling the people that they knew at YouTube and Google and apparently their contacts were a little bit more senior than some of mine even though I've done a ton of work with Google in the past.

So I think that's more what it was about. I thought it was a ban that was looking for a reason. We've started the appeal. We haven't heard anything from them. I would be in favor of your idea. I think that'd be awesome.

Just do a new account. Just do a new account and see what happens.

We got a new account and so we found a little bit of a loophole. They weren't going to let any version of AI Scott back. So we have AI Abigail now. So you can have coffee with AI Abigail, which is, you know, presumably AI Scott Adams' AI daughter. And so at least you can get the same content there. It's not going to be in Scott's likeness, but we just launched that and it's a pretty small following now. We again had our main mode of distribution was YouTube until they pulled the plug on us. So hopefully we'll...

I just had a quick question. Yeah.

How long did it take you from start to when you felt like it was good enough to share?

That's a great question. So my brother Zach is the one who did a lot of the rendering on all of that. We went through several iterations where it went from kind of just embarrassing. I would say kind of the first 5 to 10 hours that we spent on it. And then spent a few weeks tinkering and then we got it to a point where, look, it wasn't perfect, but if you watch any of the conventional Coffee with Scott Adams episodes, there were always mic issues. There were always printer issues, technical glitches. So, I think it's kind of very similar to what he had, and it makes it maybe even more real, but I guarantee you we're not intentionally causing the problems that you see. We're trying to work those out.

That's really cool.

People seem to be really mad at you, though, John. There's a lot of commentary on X. People being kind of cross about this. I know Scott Adams said he wanted this to happen, but he may have gone back and forth a little bit depending on who you ask. So, has the estate reached out to you? Have there been any kind of formal commentary from them?

So, we've heard from literally thousands of people that love what we're doing. We've heard from literally thousands of people that don't love what we're doing. My message is filled with hate and love every day. My DMs, one group we haven't heard from is the estate themselves. So, there's been some people from the show that have just kind of sent some obscenities our way, but nobody has made any inroads to have a productive conversation. I've said I've been open to that. But I haven't seen any of those attempts. And I think I understand why from the people that don't love it. I mean, if you were very close to Scott Adams as a family or friend and first of all, it's kind of bizarre to see somebody in an AI form that passed away. Second of all, if you legitimately believe their wishes were to the contrary what they publicly expressed and you believe that in your heart of hearts, that makes sense that you would try to stop that. And I think this is one of the classic Scott Adams "two movies on one screen." There's a bunch of people that were really close to Scott that says this is what he wanted. And there's a lot of people who were close to him that say this is not what he wanted. I don't want to disclose it, but I have had some extremely high-level people message me saying, "Hey, look, I've talked to Scott in the last days before he passed away. This is something that he wanted to do. You're doing a great job."

There would be a very simple solution here, Lon, in terms of IP protection, and you're a media expert, so I'm going to hand it off to you to sort of walk us through this. But in knowing what I know about IP protection, this is so close to looking like Scott Adams because it's a video replication and the voice is so perfect that number one, it could be traumatizing for family members to see this. And we hold space for that particular nuance to this discussion. That said, public figures have to be open to parody and cartoons being written about them or being mocked even or being celebrated. Any of those things. However, this is a particularly gray area. If this was done as a puppet, just to pick one, or a cartoon, Lon, this would not be as big of an issue, do you think? And how do you parse this on a moral and ethical basis?

Yeah. I mean, I think it comes down to the realism. I'm not... I can't speak for YouTube and why they did what they did or what their real motive is here, but I think the idea that a person who may not know that Scott Adams died in January, who was just flipping around, this is lifelike and realistic enough that it might cause confusion. And usually the rule with parody is that it has to be obvious that this is not true. Like any person who may not have insider knowledge of that situation or whatever would be like, "Oh, they're clearly joking." So if it was animated, if it was with a puppet, if it was very comic and over-the-top, you immediately would be like, "Oh, okay. This counts as parody. No reasonable person would watch this." Whereas AI Scott Adams, it's a testament to John and Zach's work that it is very lifelike. I mean, when I first watched it, I was like, wait, is this a real clip of Scott Adams saying he's okay with an AI or is this AI Scott Adams doing his show? And it took me a second. So, I think that's why we're on this sort of edge case gray zone is because it is so lifelike.

In terms of the ethics, I mean, I think we're all kind of on the same page. If we all feel like the man Scott Adams when he was alive was very excited about the possibilities of AI and wanted to be memorialized in this way. I think it's hard to make the argument that it's wrong to do it. I mean that was a dying man's wish. It's right to fulfill a dying man's wish. But I think if in the absence of that, I honestly think what it sort of reminds me of is like a DNR or a living will. Like we might soon be in a time where everybody just has a legal document that they fill out that's part of estate planning that you're like, I'm good with people making AI representations of myself after I'm gone versus never do that. I hate that idea.

Yeah. Explain DNR for people who are not familiar with...

A DNR would be a Do Not Resuscitate. So if you're not sick now, but you're like if I ever get to the point where I would need to be kept on a machine to be kept alive, I don't want to be... I don't want to have a breathing machine, just let me die. And I think you have to file it while you're still in sound mind. And I think that would be the same.

So DNR... Do Not Replicate. Do not... Jesse, what are your thoughts here?

I was going to pose that back to John, which is like how much of the pushback, and this is a guess, but how much of the pushback is people thinking about this one person and their wishes versus fear of AI? Like it's more of like I think some people look at this example and they're not really worried maybe just about this one isolated example. They're worried like, "Okay, if we allow this then what's next?" Like people just have this fear explosion about AI in general that I think is pushing back on all of these use cases. But I'm curious if you feel John like it's people are upset about this one guy or are they upset about AI fear?

Jess, you hit the nail on the head here. I mean that's what's going on. It's a slippery slope type of thing. People are imagining, could this happen to me? Could this happen to one of my loved ones? Could this happen to somebody else that we care a lot about? And my answer is no. Not legally. There's a bunch of laws that would prohibit this type of thing. The reason that we're doing this is because there are dozens of instances where Scott Adams, while he was alive, of sound mind, called for turning all of his likeness over to the public domain so people like myself and Zach could go out and create these types of videos. There's literally hours of him talking about this type of thing. And he did over 3,000 of these Coffee with Scott Adams podcasts during his life. Not once did he publicly say, "I'm taking that back. Don't do this anymore." There are some times where he said he changed his personal plans about what he might do. But nothing about donating this to the public domain and giving everybody full unencumbered rights, not only to make an AI like we did, which was in good spirits. He said, "If you want to have this person say things I didn't say, that's okay with me, too. I hereby authorize it in public so that you can use as many as you want and then you could use me for your personality. I authorize that." And there's dozens of these things. We posted some of them on AI Scott Adams for you to see. It's pretty unequivocal. So, I don't think there's a risk of this happening for the common person.

Jesse, you had a followup. I could see. Go ahead.

Well, I basically... you said like I actually wonder how settled this law is as it relates to all other personalities and stuff. So actually kind of just skipping off that because I'm not nitpicking you on that but more so I think all of our laws on the books in each state and federally about likenesses and about what our wishes are upon death and all these types of law... like AI was not existent when anyone wrote this stuff. So, I actually am curious like is it illegal if someone uses my face like this after... can you go after for defamation on someone if you're dead? Like there's gonna be all sorts of interesting things because the tech has never been so good that it is convincing, right? A cartoon or even like someone really good at animation, the cost barrier. So, the AI is going to make us question when cost barrier goes from why would someone spend hundreds of thousands of dollars to replicate Jesse after her death to why would someone just have an idea in an afternoon and just do it. I don't know if we know these answers. Like, it's a really interesting question. I wonder if the market's going to answer that for us because if there's a lot of demand for this sort of thing, if AI Coffee with Scott Adams goes super viral and people love it, I think it's going to change how we think about it from a demand perspective. Jason, sorry.

John, do you want to address that? And I actually can address some of the legal issues having been through that. I've been involved in a lot of litigation over my years. I'm sure you've been involved in more and so would love to hear that thought.

I think there's still existing laws, right? There's publicity laws. If you look at different states, a lot of them have laws. The Walt Disney copyright, which is separate from publicity. But a lot of laws like Texas where I'm based, I split my time between Texas and New York, they have 60 years, right? So basically for 60 years after someone's death, unless they explicitly gave that right away, you're not allowed to do that. So it doesn't matter if it's AI. There's already an existing law on the books that would prohibit that. Other states go longer, other states go shorter. But if you are out there in the public saying, I pledge this right. I donate this right. Then you are the estate. You are part of that then.

So there is a law called the Right to Publicity. And this is for famous people. How do I know about this law? Sometimes people will take me or an AI version of me and they will start selling their crypto project or some nutrient and I have to have my team go file and just write a letter and say, "Hey, don't do that." I've had this happen many times. Somebody did it in one of their promotional videos famously on the internet and I said, "Hey, please take me out of that." Why? Because you're infringing on my ability to do endorsements in other places. People pay me six and embarrassingly even seven figures for my endorsement. That's the reality of where I am in my career. It took 30 years of me building my career to be able to get those opportunities now. And so what they did was they removed me from their endorsement and then they put a puppet in and they republished it and they got even more. And I was like, "Listen guys, I'm not going to sue you. Just please just leave me out of it." And then they had some fun with me, which is totally fine.

This right is done on a state-by-state level. It's not done at the federal level. And the reason this exists is because you don't want commercial exploitation. And the people who have passed away or are alive have a business in this. So, the estate of Elvis has a massive licensing business and they will come down on you just like Mickey Mouse, but Mickey Mouse is a fictional character. For a real character like Elvis, you basically get 75-100 years from the time of death to exploit that person's likeness.

Okay, you can't use it for confusing people, etc. But there is a protected area. Editorial use like a documentary. You can make a documentary about Scott Adams right now without permission or Elvis. Artistic use. You could make an artistic album of songs as a tribute to Scott Adams and his work. You could do any type of news reporting. And if somebody happened to be like if you had a picture of me in the background of a photo at a demo day and there were 20 of us there, you don't have to pay for that. But that's why when Steve Jobs did his famous ad about the misfits and everything, each of those people in that commercial use had to be approved.

So when he said the artist, the misfits, they show Bob Dylan or the Beatles or Einstein, whoever's under a hundred years old, that has an estate.

So, here's what's going to happen. I predict with John and Scott Adams. You'll either move to an editorially protected area that doesn't infringe on the actual family's ability to do that, which would be making it more artistic, making sure it's non-commercial, and making sure it doesn't confuse the users, and you will then be protected. Or you'll have a heart-to-heart with the family and say, "Hey, we're going to make Abigail." And Abigail is an inspiration based on Scott's work and she's the female version who brings people to Scott Adams' work and it'd be super cool because it's an interpretation. It's artistic, etc. Or you'll sit down, break bread with the family and the family will give you a license to it and they'll say under these circumstances and these tools, we don't want you to do anything adult or inappropriate or racist or this or that. We don't want you to bring up the cancellation where Scott got cancelled for what he said or whatever. We just wanted to live in this zone and have the ability to approve it. And any money goes to our children.

I can tell you right now, my estate is going to defend this to the end of the earth, my 2,500 podcast episodes and growing. So that my three daughters get every penny of everything because I'm not giving any money to charity when I go. I'm giving it to my three daughters to go rule the universe and be queens and take over the empire.

We are getting a lot of pushback from the chat. Jason, I feel like I should mention a lot of folks in the chat upset with our guest. Rapid fire. So Dr. Davis 62, Scott Adams spent the last year explaining on air that he would not create an AI Scott Adams because he did not feel that the tech was up to the task. Leo Opa, the age of the AI agent is akin to ethical slavery. Another Dr. Davis, he did not want to be memorialized this way and said so on his podcast. He looked at the tech and felt that it would misrepresent him. So John, do you want to respond to these people who feel like Scott was clear at the end of his career that he didn't actually want an AI clone?

End of his life. Yeah, absolutely. First, let me respond to what Jason said. I'm with you, Jason, and I would love to have that type of conversation. There's been no attempt to have it. Any of my attempts to have it have kind of fallen on deaf ears. So, I'd love to have that conversation.

Second of all, the question I would pose for everybody that is in line with those comments is if you're somebody who wants to pledge your existence so that people can make AIs out of you, how do you do it? Because Scott Adams did it, tried dozens of times and said, "This is what I want." And despite some of those comments, there is not one video segment of him revoking it or saying, "Look, don't do this anymore. I know I said this over and over again. I pledge my likeness, everything about me to the public domain. Go out there and make AIs." That's what he said. There's many videos of him saying that. No videos of him not saying that.

So, how would somebody even do that? I mean, that's the question I would pose for everybody else because if I die, hopefully I'm immortal, but if I die, I'm signed up to go to Alcor where I'm frozen out in I think it's in Scottsdale. And it's kind of a scary thing. If people love and care about you, they might decide, no, John doesn't really want that, right? And normally we have wills and last testaments for that type of thing. But Scott did something even better. He said that to the public and that does constitute a pledge and something that he wanted to do. So for all these people filling up your comments saying he didn't want this, this sounds a lot like mind reading to me and it's something that Scott Adams warned against. Don't try to predict what other people want. Go by what their words are.

All the corpses are in Arizona. Why would we put all the frozen people in the hottest part of the United States? I think it's less earthquakes. I got to think it has to do with laws as well.

Anyway, Scott had a concept of "internet dads" and I think I was part of that group of Gen X dads. Or as people are starting to call me... I guess that's like a way of saying boomer. They call me...

Yeah. Yeah. They're calling me now. I think he's going to get into a new category pretty soon.

So here's what I'm going to give my ruling as the chairman of the interwebs.

My ruling is Scott would have loved this. Scott would have loved it. And Scott would have had some space that if it was hurting his family members and it was traumatizing for them, if it was too soon a month after his death, where the fidelity wasn't there, where they didn't have approval of it, he would also have taken that into account. As such, I am laying my judgment down. John, you got to break bread with the family. And if you're going to make a literal one, you have to then get their permission.

However, if John wants to make one that is a sendup parody female version, a muppet version that is extremely clear to the public that this is not Scott Adams, it is an inspiration of Scott's philosophy carrying on in the future that there is space for that as well. And that means it would have to have another name and in the fine print say "hey this is inspired by our love for Scott Adams' philosophy." That is my ruling and you can appeal it. The appeal can happen at any time by any person. And we will thank John for coming to the program. And to the family of Scott Adams, what a tremendous career. We miss him. He and I debated things. I was on a show one time. We had crazy debates about January 6th and all kinds of things. But I think he was a net positive for the world and actually did care about people. So, rest in peace. Power, replicant, Scott Adams. Peace is good.

We do want to congratulate... We'll drop you off. Oh, sorry. Thanks, John. Oh, go ahead. Yeah, go ahead.

I was going to say before we end the show. You've got that wrap-up voice going. We should congratulate our Mac Mini winner from the live chat. We have selected a winner. Congratulations to notwokejinkies. Great username. You have won our Mac Mini competition. We got over 500 likes. Once Mac minis are available again, maybe next year sometime.

Well, you know what? Whatever the base level Mac Mini is, we'll just send you...

Oh, I was about to say... No, no. I'm not playing any games. No, no, no. JCAL, we're getting you a cluster of six Mac Studios just like Jesse. Yeah, you're not doing Jesse's plan.

No, but I got Jesse on the hook. I accepted that 125K check. You're a star, Jesse. Thanks for coming, Heaton. John, thank you for...

Yeah. Here's what I want to do as well. You can just give people in the case of the Mac Mini, you just give them a gift card because it'll be under 600 taxable. We'll just make it like 5.99. It's like... don't share our secrets live on the air. What if there's a CPA?

Just send them a gift card. And if they wind up buying a Mac and AirPods it's up to them.

Okay, we promised we'd answer lightning round those four questions people had from me. Jesse, Heaton, John, you could drop off. We will see you on the next episode. Well done. Well done. Plenty in the show notes about those great guests we had.

All right, rapid fire. Alex, read the first question from the page. People put up 20 bucks or something like that. We'll keep an eye on however much money we net from these and we're going to give them to charity and pick a good charity. But give me those rapid fire, Alex.

All right, first up: What's the first role startups should use agents to automate? By the way, Launch application submitted.

Okay, what's the first role startups should use agents to automate? Essentially pick a role. Where do you start?

Yeah. Super easy. There's customer support, which is looking at the tickets coming in and then trying to bridge the tickets to product features. That's a no-brainer. Customer support. Easy peasy lemon squeezy. The other piece I think that's really good is hiring. Going and trying to find people. The other is go-to-market to try to find potential customers. All of those involve some outreach and interpretation. And all of those are going to lower costs or increase revenue, which is what you're always trying to think about.

Next question from Adam F-77. How do you ensure personal security while using OpenClaw? Meaning, how do you know all of your personal info is safe? I think the answer is you don't.

Well, you start with a persona in the cloud that has no access to your data. Then you give it its own Gmail account, its own calendar. Then you could selectively, let's say you just call this Jane Doe 123 at Gmail. You could give Jane Doe 123 at Gmail access to a Google doc by sharing it or a Notion page. And then they would have read-only access. As you get more comfortable with this and you feel it's secure, you might give it write access not to your docs but to its own.

So you just step by step, brick by brick, give it more access. Read-only saves you all problems unless you're read-only your bank statements or you're reading something else. Then you can also train it to not talk to anybody but you and to not share any information outside of one location. So you tell it, hey, I only want you to talk to me on this specific Slack channel. No other communications with anybody including me outside of the Slack channel. Now this idea of injecting attack goes away. If somebody emails Jane Doe 123 at Gmail, it's been trained to not respond to that, right?

And you can just say never send emails. You can read emails only. And there are third-party tools where you could say all the emails coming in go into a database, etc.

Okay, let's take another question from Manny V Soul. How do you see OpenClaw being adopted by private equity? This fixes the AI revenue, data moat, and system of record for SaaS.

Sorry, say it one more time. I got distracted.

You're fine. Manny V Soul asks, "How do you see OpenClaw being adopted by private equity?" And then he adds, "This fixes the AI revenue data moat and system of record for SaaS."

Yeah. So the data, the source of data, this place where your data exists whether it's Notion or a CRM system like Salesforce or HubSpot, that's probably going to continue but you might say at some point all of the interface will occur in my Slack room while talking to them or a dashboard we create. So what does that mean for the system of record? It might mean that you use the lowest version of it. You get everybody's seats off of it and you just interact with it through two accounts, your personal admin account and then this one replicant account. So, if you had 20 seats for your CRM provider, what if you went down to two and you just interfaced with it through your Slack? Eventually, people will say, I want to build my own CRM and have it living on my own premises. And that is where people have a challenge with these... oh my god am I going to lose... am I going to eventually deprecate software products? And that's where you might have some stickiness here. Stickiness to the bot and less loyalty to the SaaS software. Good question.

One last one, Jason. This is more of a comment from our friend Chance J. Robinson. He says, "I think for a while AI got a little stale. We all wanted it to do things that it just wouldn't. In comes Claudebot, OpenClaw, and overnight the curious genius wakes up again. I think I'm graduating to a new nerd level."

Lol. I think Chance kind of hits the nail on the head. It did seem that AI was getting a little bit stale for a little bit there. And holy crap. Talk about a new era and a new year, Jason. Absolutely great insight there from Chance, which was having a better search engine where like, hey, Lon's doing some search for something of movies or whatever. And it's like, okay, yeah, I'll be your movie curator. Great. Oh, you're summarizing everybody's opinion on the latest Oscar picks. Okay, that's all great. But at some point, you wanted to say, hey, go find me movies like this. Download them to my iPad. And then get me the summary of it so I could watch it on an airplane. You wanted to actually go do something in the real world. Go buy me tickets to it or find a revival house and then tell me over the next year, put on my calendar all the best movies that I haven't seen. Here's the movies I have and then just DM me when my schedule has a Thursday, Friday, or Saturday open and tell me what's at the revival house so I don't have to remember to do that. You wanted to do real-world things to actually provide value because we've squeezed as much juice as we can from deep research.

I agree with that entirely and I got to say I'm not staying up till 2 or 3 in the morning like Heaton is but I am thinking about this all the time and that to me is indication that things are changing because it's making me rethink and reexamine.

His name is Lon Harris. Follow him. x.com/lons. He's Alex. x.com/alex. They're part of the four-letter club on Twitter. I'm right behind him. x.com/jason. I got more work to do. If I could get rid of the A and just be JSON. JSON. Yeah. Better JSON. We'll see you all on Wednesday for another live. Insane.
