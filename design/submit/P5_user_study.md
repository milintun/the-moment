# User Study

## Tasks

| title | instruction | rationale |
|---|---|---|
| Register | Register an account and login to the app. | Test standard authentication flow. Test error handling with taken usernames and insufficient passwords. |
| Navigate using map | Find the map. Use it to navigate to other pages like galleries or archive. | Testing the primary method of navigating around the entire app. The interactive map is non-standard but has similarities to Google Map street view—test if users can intuitively use it without additional instruction. |
| Browse galleries | Look through posts in a gallery. Upvote ones you like. Unvote ones you accidentally upvote. | Evaluating the primary action of a visitor. Also testing sequential navigation flow through the app, going from gallery to gallery in order. Testing reactivity to voting interactions. |
| Post | Post a piece of your artwork to a relevant gallery. | Evaluating the primary action of an artist. Testing for convenience and simplicity of post upload flow. Also looking for what kinds of content the user seeks to upload. |
| Nominate | Find the nomination page. Nominate an idea for a future gallery. | Overall, using the map and built-up expectations to navigate to a new page and contribute something. Test “one nomination per day” rule. Also look for what kinds of galleries users want to see. |

## User Test 1: Siddhu

### Task notes

1. register
    1. entered through the logging page
    2. what am i getting into?
    3. facebook will tell show you previews of what you get by creating an account
    4. standard
2. navigate using map
    1. not immediately clear that map can be expanded on hover
    2. really cool
    3. even more clear that neighboring rooms are genuinely neighboring
3. browse galleries
    1. have to scroll all the way through to get to new gallery
    2. “want to save all the ones i like”
    3. “cant find anything about the maker”
    4. try to zoom in on images
4. post
    1. caption vs title
        1. social media slop
    2. intuitive
    3. no video - justified?
    4. easy to delete
5. nominate
    1. seemed comfortable with the map
    2. lots of text
    3. want to be able to describe / justify nominations

### Debrief

Overall thoughts / impressions
- some accented text should be clickable
- door is maybe not intuitively an enter button
- **organically form opinion - influenced by most voted**

Worked well
- clean
- usable
- more cool interactive elements
    - MY creative moments

Didn't work well
- more clear on where you would nominate - it just says “future galleries” something “nomination nation”
- add more detail, explanation, images to nominations
- forgot password
- want to see WHY other people liked a post, like comment section

### Report

The first thread of observations I noticed in Siddhu’s use of The Moment was comparing to popular social media platforms such as FaceBook or Instagram. When he first logged in, he asked, “What am I getting into?” and mentioned that FaceBook first displays potential posts, slightly obscured by a blur or gradient in order to draw you in and show you what you could unlock by signing in. He frequently noted when an expected feature that social media usually exhibits was not present such as viewing all the posts you have liked, clicking on a user to view their profile and posts, and commenting. He had an urge to find out more—about the piece of art, what others thought about it, who the artist was, and what else they had posted. The app exhibited many social media-like features and was thus potentially frustrating when it didn’t actually offer the same expected experience.

Following Siddhu’s frustration with the lack of social media features, I expressed during the debrief the goal of public rather than personal curation. The Moment intentionally doesn’t cater to an individual experience. He then pointed out that the visibility and sorting of posts by the number of votes hindered this goal. People are more likely to see something redeemable in a piece of artwork that has already made its way to the top. Would the public curation truly be an accurate reflection of aggregated individual taste, or would it be biased by conformity?

## User Test 2: Gigi

### Task notes

1. register
    1. easy and intuitive
2. navigate using map
    1. first uses minimap
    2. not immediately clear to expand map
    3. want more natural progression
3. browse galleries
    1. intuitive to unvote
    2. really easy
4. post
    1. image too big
        1. error message not visible enough
        2. should be able to accept because photography is huge
5. nominate
    1. remembered and found future galleries room
    2. reading before nominating
    3. easy

### Debrief

- questions
    - confusion on what are seasons
        - makes sense for recurring, not for one-offs
    - no limit on posts?
        - suggest 1 piece a day
    - list materials info under pieces
- like
    - side scroll
    - white
    - all intuitive
    - one accent
- comments
    - nicer for specific one-offs
        - a week
        - a ton of people for day
    - archive should be more like a highlight reel
        - **the temporality is what makes it special — thats what museums do**
    - feels more curated than pinterest
        - real art vs infiltrated with reposts from social media
    - also suggested saving posts

### Report

Gigi is a photographer herself and avid museum-goer. When she’s not physically going to museums, she looks through Pinterest for art inspiration. She moved through most of the tasks with ease, and mentioned that they were all intuitive. I observed that it was not immediately clear to her that she could expand the map by clicking on it, and she also mentioned wanting a more natural progression between rooms. One point of error occurred during the posting task, because she attempted to upload her photography, which was larger than the 10mb limit. The error message was very subtle, so she inferred what was happening and upload a screenshot of her work instead.

During our debrief, we discussed the seasons concept. It was challenging for her to understand, especially because the galleries in the demo app were very specific, i.e. “kitchen still-life.” I explained that seasons exist for more broad recurring galleries such as “figure drawing,” which should refresh every week / month. More specific galleries should be one-offs (never repeat), such as “bus stops.” She understood this distinction, and suggested that the more specific galleries were much more compelling than broader ones like “photography.”

Lastly, we discussed the gallery archive, where users can go back and view all past seasons and work without voting or posting. Gigi suggested making this more like a highlight reel or trophy case of the top posts from each season. This was partially due to the page being very nested and difficult to navigate. The primary reason, however, was that she said that temporality is what makes museum exhibits special. Pieces are up for a limited amount of time and then they’re gone. They’re not meant to be accessible by anyone, anywhere, at any time.

## Design Flaws & Opportunities

| flaw | why | future solutions | level | degree |
|---|---|---|---|---|
| Users expect common social media features | Since there are profiles, posting, voting, and scrolling, the app inherently feels like social media. Therefore, users expect it to exhibit features and interactions like other social medias. | • Diverge even more from social media-like interactions<br>• Add these features | Physical | Moderate |
| Novel interactions are unintuitive | Unfamiliar such as the door entrance or interactive map require a learning curve and user exploration because they are non-standard UI components. | • Add richer labeling to components<br>• More detailed instruction<br>• Provide alternative standard components to access the same thing | Linguistic | Minor |
| 10MB image upload limit too small | Photography produces very large files and the platform should expect that artists want to upload high quality images of their work. | • Increase image upload limit<br>• Automatically compress user artwork before storing it | Physical | Moderate |
| Seasons concept is confusing | The idea of a gallery having multiple seasons is unfamiliar. It only applies to broader categories such as “Photography,” which users expressed are much less compelling than specific ones. | • Remove seasons concept<br>• Rename to “rounds” or “cycles” | Conceptual | Moderate |
