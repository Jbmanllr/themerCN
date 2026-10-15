import { CategoryNav } from "@/components/blog/category-nav"
import { PostCard } from "@/components/blog/post-card"
import { PageIntro } from "@/components/marketing/page-intro"
import { posts } from "@/lib/mock"

export const metadata = { title: "Journal" }

export default function JournalPage() {
  const [latest, ...rest] = posts
  return (
    <>
      <PageIntro
        title="Journal"
        lede="Brew guides, trips to origin and gear we would buy again, written by the people who roast your coffee."
        className="md:grid-cols-1"
      >
        <CategoryNav />
      </PageIntro>
      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4 pt-4 pb-20 sm:px-6">
        {latest ? <PostCard post={latest} featured /> : null}
        <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      </div>
    </>
  )
}
