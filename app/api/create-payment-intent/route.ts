import prisma from "@/libs/prismadb";
import { NextResponse } from "next/server";
import { CartProductType } from "@/app/product/[productId]/ProductDetails";
import { getCurrentUser } from "@/actions/getCurrentUser";
import { products } from "@/utils/products";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

const calculateOrderAmount = (items: CartProductType[]) => {
  const totalPrice = items.reduce((acc, item) => {
    const itemTotal = item.price * item.quantity;
    return acc + itemTotal;
  }, 0);

  return totalPrice;
};

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.error();
  }

  const body = await request.json();
  const { items, payment_intent_id } = body;
  const total = Math.round(calculateOrderAmount(items) * 100);
  const orderData = {
    user: { connect: { id: currentUser.id } },
    amount: total,
    currency: "eur",
    status: "pending",
    deliveryStatus: "pending",
    paymentIntentId: payment_intent_id,
    products: items,
  };

  if (payment_intent_id) {
    const current_intent = await stripe.paymentIntents.retrieve(
      payment_intent_id
    );

    if (current_intent) {
      const updated_intent = await stripe.paymentIntents.update(
        payment_intent_id,
        { amount: total }
      );

      // update the order

      const [existing_order, updated_order] = await Promise.all([
        prisma.order.findFirst({
          where: { paymentIntentId: payment_intent_id },
        }),
        prisma.order.update({
          where: { paymentIntentId: payment_intent_id },
          data: {
            amount: total,
            products: items,
          },
        }),
      ]);

      if (!existing_order) {
        return NextResponse.error();
      }

      return NextResponse.json({ paymentIntent: updated_intent });
    }
  } else {
    //create the intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: total,
      currency: "eur",
      automatic_payment_methods: { enabled: true },
    });

    //create the order
    orderData.paymentIntentId = paymentIntent.id;
    await prisma.order.create({
      data: orderData,
    });

    return NextResponse.json({ paymentIntent });
  }

  // return a default response (e.g., an error response) if none of the conditions are met
  return NextResponse.error();
}
