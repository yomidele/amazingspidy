import { Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const requestSubscriptionHref =
  "mailto:?subject=Investor%20Dashboard%20subscription%20renewal&body=Hello%2C%20I%20would%20like%20to%20request%20renewal%20of%20my%20Investor%20Dashboard%20subscription.";

interface Props {
  onReturnToContributor?: () => void;
}

const InvestorSubscriptionExpiredScreen = ({ onReturnToContributor }: Props) => (
  <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
    <Card className="w-full max-w-xl border-border shadow-lg">
      <CardContent className="px-6 py-10 text-center sm:px-10">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Lock className="h-7 w-7" aria-hidden="true" />
        </div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Investor subscription
        </p>
        <h1 className="text-xl font-bold sm:text-2xl">INVESTORS DASHBOARD LOCKED</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Your Investors Dashboard subscription has expired.
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          To continue accessing investment opportunities, analytics, reports, and other investment features,
          please contact the platform administrator to renew your subscription.
        </p>

        <dl className="my-7 divide-y divide-border rounded-md border border-border text-left">
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-muted-foreground">Monthly subscription</dt>
            <dd className="text-sm font-semibold">₦40,000</dd>
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-muted-foreground">Status</dt>
            <dd className="text-sm font-semibold">Awaiting Subscription</dd>
          </div>
        </dl>

        <div className="flex flex-col items-center gap-3">
          <Button asChild className="w-full sm:w-auto">
            <a href={requestSubscriptionHref}>
              <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
              Request Subscription
            </a>
          </Button>
          {onReturnToContributor && (
            <Button variant="link" onClick={onReturnToContributor}>
              Return to Contributor Dashboard
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  </main>
);

export default InvestorSubscriptionExpiredScreen;