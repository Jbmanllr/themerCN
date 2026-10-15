import { NavLink } from "@/components/site/nav-link"
import { postCategories } from "@/lib/mock"

const linkClass =
  "inline-flex h-9 items-center rounded-full border px-4 text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 data-active:border-primary data-active:bg-primary data-active:text-primary-foreground"

/** The journal's category switcher: all posts, then one link per category. */
export function CategoryNav() {
  return (
    <nav aria-label="Journal categories">
      <ul className="flex flex-wrap gap-2">
        <li>
          <NavLink href="/blog" exact className={linkClass}>
            All posts
          </NavLink>
        </li>
        {postCategories.map((category) => (
          <li key={category.slug}>
            <NavLink
              href={`/blog/category/${category.slug}`}
              className={linkClass}
            >
              {category.name}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
