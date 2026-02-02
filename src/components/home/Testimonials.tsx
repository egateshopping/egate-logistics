import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Ahmed Al-Rashid',
    location: 'Riyadh, Saudi Arabia',
    avatar: '👨🏻‍💼',
    rating: 5,
    text: 'Finally, a reliable way to shop from US stores! Got my Nike sneakers delivered in just 10 days. The tracking was excellent.',
  },
  {
    name: 'Fatima Hassan',
    location: 'Dubai, UAE',
    avatar: '👩🏻‍💻',
    rating: 5,
    text: 'Egate made it so easy to order from Amazon and Apple. Their customer service answered all my questions instantly via WhatsApp.',
  },
  {
    name: 'Omar Khalil',
    location: 'Kuwait City, Kuwait',
    avatar: '👨🏻‍🔧',
    rating: 5,
    text: 'I\'ve been using Egate for 6 months now. Best prices for international shipping I\'ve found. Highly recommend!',
  },
  {
    name: 'Sara Al-Mutairi',
    location: 'Doha, Qatar',
    avatar: '👩🏻‍🎨',
    rating: 5,
    text: 'Ordered makeup from Sephora that isn\'t available here. Package arrived safely with all items intact. Will order again!',
  },
  {
    name: 'Khalid Mansour',
    location: 'Manama, Bahrain',
    avatar: '👨🏻‍💻',
    rating: 5,
    text: 'The auto-fetch feature is amazing - just paste a link and everything fills in automatically. So convenient!',
  },
  {
    name: 'Layla Ibrahim',
    location: 'Muscat, Oman',
    avatar: '👩🏻‍🔬',
    rating: 5,
    text: 'Trustworthy service with transparent pricing. No hidden fees like other services I\'ve tried. 100% recommended.',
  },
];

export function Testimonials() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            What Our Customers Say
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Trusted by thousands of shoppers across the Middle East
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="relative p-6 bg-card border border-border rounded-2xl hover:shadow-soft transition-all"
            >
              <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/10" />
              
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-2xl">
                  {testimonial.avatar}
                </div>
                <div>
                  <h4 className="font-semibold">{testimonial.name}</h4>
                  <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                </div>
              </div>

              <div className="flex gap-1 mb-3">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                ))}
              </div>

              <p className="text-muted-foreground text-sm leading-relaxed">
                "{testimonial.text}"
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
