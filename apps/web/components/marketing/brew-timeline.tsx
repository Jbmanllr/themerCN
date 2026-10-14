// The home page's signature: a pour-over recipe laid out on its clock. The
// content is a real sequence (time order), so it is an ordered list on a track.

const pours = [
  {
    time: "0:00",
    title: "Bloom",
    body: "45 g of water. Wait while the bed puffs up and the gas escapes.",
  },
  { time: "0:45", title: "First pour", body: "Slow circles up to 100 g." },
  {
    time: "1:15",
    title: "Second pour",
    body: "Up to 150 g. Keep the stream thin.",
  },
  {
    time: "1:45",
    title: "Third pour",
    body: "Up to 200 g. Give the dripper a swirl.",
  },
  { time: "2:15", title: "Last pour", body: "Up to 250 g, then let it drain." },
  {
    time: "3:45",
    title: "Drink",
    body: "Flat bed, empty dripper, a cup that tastes like the bag says.",
  },
]

export function BrewTimeline() {
  return (
    <section
      aria-labelledby="brew-heading"
      className="mx-auto max-w-6xl px-4 py-16 sm:px-6"
    >
      <div className="flex max-w-2xl flex-col gap-3">
        <h2
          id="brew-heading"
          className="font-heading text-3xl text-balance sm:text-4xl"
        >
          Four minutes, five pours
        </h2>
        <p className="text-lg text-muted-foreground">
          Our house recipe for a light roast: 15 g of coffee, 250 g of water at
          94 °C. Nothing about it is fast, and that is the point.
        </p>
      </div>
      <ol
        aria-label="A four-minute pour-over"
        className="relative mt-12 grid gap-8 before:absolute before:top-2 before:bottom-2 before:left-[7px] before:w-0.5 before:bg-border md:grid-cols-6 md:gap-6 md:before:top-[7px] md:before:right-0 md:before:bottom-auto md:before:left-0 md:before:h-0.5 md:before:w-auto"
      >
        {pours.map((pour, index) => {
          const last = index === pours.length - 1
          return (
            <li
              key={pour.time}
              className="relative flex gap-5 md:flex-col md:gap-4"
            >
              <span
                aria-hidden
                className={
                  last
                    ? "relative z-10 mt-0.5 size-4 shrink-0 rounded-full bg-accent ring-4 ring-background md:mt-0"
                    : "relative z-10 mt-0.5 size-4 shrink-0 rounded-full bg-primary ring-4 ring-background md:mt-0"
                }
              />
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-sm text-muted-foreground">
                  {pour.time}
                </span>
                <span className="font-heading text-xl">{pour.title}</span>
                <span className="text-sm text-muted-foreground">
                  {pour.body}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
