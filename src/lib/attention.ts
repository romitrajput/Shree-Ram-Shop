import "server-only";
import { db } from "./db";

/** Things waiting for the owner: shown as badges and as the "Needs attention" list. */
export async function getAttention() {
  const twoHoursAgo = new Date(Date.now() - 2 * 3600_000);
  const twoDaysAgo = new Date(Date.now() - 48 * 3600_000);
  const [toVerify, newEnquiries, pendingReviews, unfinishedCheckouts, codToShip] = await Promise.all([
    db.order.count({ where: { status: "PAYMENT_SUBMITTED" } }),
    db.corporateEnquiry.count({ where: { status: "NEW" } }),
    db.review.count({ where: { status: "PENDING" } }),
    db.checkoutLead.count({ where: { orderId: null, contactedAt: null, createdAt: { lt: twoHoursAgo, gte: twoDaysAgo } } }),
    db.order.count({ where: { paymentMethod: "COD", status: "CONFIRMED" } })
  ]);
  return { toVerify, newEnquiries, pendingReviews, unfinishedCheckouts, codToShip };
}
