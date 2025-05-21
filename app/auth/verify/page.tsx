import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"

export default function VerifyPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center font-bold">Check your email</CardTitle>
          <CardDescription className="text-center">
            We&apos;ve sent you a verification link to your email address
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            Please check your email and click on the verification link to complete your registration. If you don&apos;t
            see the email, check your spam folder.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Link href="/auth/login" className="w-full">
            <Button className="w-full">Return to login</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
