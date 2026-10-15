import { NavLink } from "@/components/site/nav-link"
import { categories } from "@/lib/mock"

const pill =
  "inline-flex h-9 items-center rounded-full border px-4 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-active:border-primary data-active:bg-primary data-active:text-primary-foreground"

/** Pills linking every shop category; the current one is marked. */
export function CategoryNav() {
  return (
    <nav aria-label="Shop categories">
      <ul className="flex flex-wrap gap-2">
        <li>
          <NavLink href="/shop" exact className={pill}>
            Everything
          </NavLink>
        </li>
        {categories.map((category) => (
          <li key={category.slug}>
            <NavLink href={`/shop/${category.slug}`} className={pill}>
              {category.name}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
