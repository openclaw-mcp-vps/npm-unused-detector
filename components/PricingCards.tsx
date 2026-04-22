import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PricingCardsProps = {
  compact?: boolean;
};

export function PricingCards({ compact = false }: PricingCardsProps) {
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

  return (
    <div
      className={`grid gap-6 ${compact ? "md:grid-cols-2" : "lg:grid-cols-2"}`}
      data-animation="fade-up"
    >
      <Card className="border-accent/30 bg-gradient-to-b from-[#132218] to-surface">
        <CardHeader>
          <Badge className="w-fit" variant="default">
            One-Time
          </Badge>
          <CardTitle className="mt-2 text-2xl">$3 per scan</CardTitle>
          <CardDescription>
            Perfect when you want a clean-up report before a release or major refactor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted">
            <li>AST-based dependency usage detection</li>
            <li>Unused `dependencies` + `devDependencies` list</li>
            <li>Estimated package size savings and uninstall commands</li>
          </ul>
        </CardContent>
        <CardFooter>
          <a
            href={paymentLink}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ size: "lg" }), "w-full")}
          >
            Buy Single Scan
          </a>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <Badge className="w-fit" variant="secondary">
            Best for solo devs
          </Badge>
          <CardTitle className="mt-2 text-2xl">$12 / month</CardTitle>
          <CardDescription>
            Unlimited scans for every side project, client repo, and experiment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted">
            <li>Unlimited scans all month</li>
            <li>Github URL + file upload workflows</li>
            <li>Fast reports tuned for indie projects</li>
          </ul>
        </CardContent>
        <CardFooter className="flex-col items-start gap-3">
          <a
            href={paymentLink}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ size: "lg" }), "w-full")}
          >
            Start Unlimited Plan
          </a>
          {!compact ? (
            <p className="text-xs text-muted">
              Set your Stripe Payment Link completion URL to
              {" "}
              <code>/api/access/claim?session_id={'{CHECKOUT_SESSION_ID}'}</code>
              {" "}
              so paid users unlock instantly.
            </p>
          ) : null}
        </CardFooter>
      </Card>
    </div>
  );
}
