import { Link2, CreditCard, Truck, CheckCircle } from 'lucide-react';

const steps = [
  {
    icon: Link2,
    title: 'Paste Link',
    description: 'Copy any product URL from your favorite US store and paste it on our homepage.',
  },
  {
    icon: CreditCard,
    title: 'Pay & Confirm',
    description: 'Review the total cost including shipping, then complete your payment securely.',
  },
  {
    icon: Truck,
    title: 'We Ship',
    description: 'We purchase, receive at our warehouse, and ship internationally to you.',
  },
  {
    icon: CheckCircle,
    title: 'Receive',
    description: 'Track your package every step of the way until it arrives at your door.',
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Four simple steps to get any US product delivered to your doorstep
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={step.title} className="relative">
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/30 to-transparent" />
              )}
              <div className="text-center space-y-4">
                <div className="relative inline-flex">
                  <div className="flex items-center justify-center w-24 h-24 rounded-2xl gradient-hero shadow-glow">
                    <step.icon className="h-10 w-10 text-primary-foreground" />
                  </div>
                  <span className="absolute -top-2 -right-2 flex items-center justify-center w-8 h-8 rounded-full bg-background border-2 border-primary text-primary font-display font-bold text-sm">
                    {index + 1}
                  </span>
                </div>
                <h3 className="font-display font-semibold text-xl">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
