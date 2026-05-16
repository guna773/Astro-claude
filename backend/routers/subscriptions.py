"""
routers/subscriptions.py
------------------------
POST /api/create-subscription

Creates a Razorpay order for the requested subscription plan and returns
the order details the frontend needs to open the Razorpay checkout.

Plans:
    free    →  ₹0      (no Razorpay order needed)
    premium →  ₹199/mo  (19900 paise)
    elite   →  ₹999/mo  (99900 paise)
"""

import logging
from typing import Any

import razorpay
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from config import settings
from supabase_client import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class SubscriptionRequest(BaseModel):
    user_id: str
    plan: str = Field(..., description="One of: free | premium | elite")
    email: str = Field(default="", description="User email for Razorpay receipt")
    name: str = Field(default="", description="User name for Razorpay receipt")
    contact: str = Field(default="", description="User phone number (optional)")


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _razorpay_client() -> razorpay.Client:
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise RuntimeError("Razorpay credentials not configured.")
    return razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )


def _update_user_plan(user_id: str, plan: str, order_id: str) -> None:
    """Best-effort update of subscription info in Supabase."""
    try:
        sb = get_supabase()
        sb.table("subscriptions").upsert(
            {
                "user_id": user_id,
                "plan": plan,
                "razorpay_order_id": order_id,
                "status": "pending",
            },
            on_conflict="user_id",
        ).execute()
    except Exception as exc:
        logger.warning("Failed to update subscription in DB: %s", exc)


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/create-subscription")
async def create_subscription(req: SubscriptionRequest) -> dict[str, Any]:
    """
    Create a Razorpay order for the given plan.

    Free plan: returns immediately with no order.
    Paid plans: returns Razorpay order details + key_id for checkout.
    """
    plan = req.plan.lower()

    if plan not in settings.PLAN_AMOUNTS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid plan '{plan}'. Choose from: free, premium, elite.",
        )

    amount = settings.PLAN_AMOUNTS[plan]

    # Free plan – no payment required
    if amount == 0:
        _update_user_plan(req.user_id, plan, "free")
        return {
            "success": True,
            "plan": plan,
            "amount": 0,
            "currency": "INR",
            "payment_required": False,
            "message": "Free plan activated. No payment needed.",
        }

    # Paid plan – create Razorpay order
    try:
        rzp = _razorpay_client()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    plan_labels = {
        "premium": "Jyotish AI Premium – ₹199/month",
        "elite": "Jyotish AI Elite – ₹999/month",
    }

    order_payload = {
        "amount": amount,
        "currency": "INR",
        "receipt": f"jyotish_{req.user_id[:8]}_{plan}",
        "notes": {
            "user_id": req.user_id,
            "plan": plan,
            "product": plan_labels.get(plan, "Jyotish AI"),
        },
    }

    try:
        order = rzp.order.create(data=order_payload)
    except Exception as exc:
        logger.error("Razorpay order creation failed: %s", exc)
        raise HTTPException(
            status_code=502,
            detail=f"Payment gateway error: {exc}",
        )

    order_id = order.get("id", "")

    # Persist pending subscription
    _update_user_plan(req.user_id, plan, order_id)

    # Prefill for Razorpay checkout
    prefill: dict[str, str] = {}
    if req.name:
        prefill["name"] = req.name
    if req.email:
        prefill["email"] = req.email
    if req.contact:
        prefill["contact"] = req.contact

    return {
        "success": True,
        "plan": plan,
        "amount": amount,
        "currency": "INR",
        "payment_required": True,
        "razorpay_order_id": order_id,
        "razorpay_key_id": settings.RAZORPAY_KEY_ID,
        "description": plan_labels.get(plan, "Jyotish AI Subscription"),
        "prefill": prefill,
        "message": f"Order created. Proceed to payment for the {plan} plan.",
    }


@router.post("/verify-payment")
async def verify_payment(
    user_id: str,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
) -> dict[str, Any]:
    """
    Verify Razorpay payment signature and activate the subscription.
    Call this from your frontend after successful payment.
    """
    try:
        rzp = _razorpay_client()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    params = {
        "razorpay_order_id": razorpay_order_id,
        "razorpay_payment_id": razorpay_payment_id,
        "razorpay_signature": razorpay_signature,
    }

    try:
        rzp.utility.verify_payment_signature(params)
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Payment signature verification failed.")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Payment verification error: {exc}")

    # Activate subscription in DB
    try:
        sb = get_supabase()
        sb.table("subscriptions").update(
            {
                "status": "active",
                "razorpay_payment_id": razorpay_payment_id,
            }
        ).eq("user_id", user_id).eq("razorpay_order_id", razorpay_order_id).execute()
    except Exception as exc:
        logger.error("Failed to activate subscription in DB: %s", exc)

    return {
        "success": True,
        "message": "Payment verified. Subscription activated!",
        "razorpay_payment_id": razorpay_payment_id,
    }
