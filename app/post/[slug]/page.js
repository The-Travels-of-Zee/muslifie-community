import DetailedPost from "@/components/DetailedPost";
import { getPost } from "@/lib/actions/posts";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const postId = slug.split("-").pop();

  try {
    const result = await getPost(postId);

    if (result?.success && result?.post) {
      const post = result.post;

      // Pick main image (first in array, if available)
      const mainImage = post.images?.[0] || null;

      // Short description (prefer content excerpt, fallback to title)
      const description = post.content?.slice(0, 160) || post.title || "Read more on Muslifie Community";

      return {
        title: `${post.title} | Muslifie Community`,
        description,
        keywords: post.tags || [],
        authors: [{ name: post.userInfo?.fullName || "Anonymous" }],
        openGraph: {
          title: post.title,
          description,
          type: "article",
          url: `https://your-domain.com/post/${slug}`,
          images: mainImage
            ? [
                {
                  url: mainImage,
                  alt: post.title,
                },
              ]
            : [],
        },
        twitter: {
          card: "summary_large_image",
          title: post.title,
          description,
          images: mainImage ? [mainImage] : [],
        },
      };
    }
  } catch (error) {
    console.error("Failed to load post metadata:", error);
  }

  // Fallback metadata if post not found
  return {
    title: "Post not found | Muslifie Community",
    description: "The post you’re looking for could not be found.",
  };
}

export default async function PostDetailPage({ params }) {
  const { slug } = await params;
  return <DetailedPost slug={slug} />;
}
