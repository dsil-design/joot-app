import { Button } from '@/components/ui/button'

export default function ErrorPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-destructive">
            Authentication Error
          </h1>
          <p className="text-sm text-muted-foreground">
            Sorry, we couldn't authenticate you. Please try again.
          </p>
          <Button
            asChild
            variant="default"
            className="w-full"
          >
            <a href="/login">
              Try Again
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
