import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, CreditCard, LoaderCircle } from "lucide-react";
import { authApi, paymentApi, setSession } from "../api";
import { useStore } from "../store";

type CheckoutData = { paid?: boolean; orderId: string; amount: number; currency: string; keyId: string; name: string; description: string; prefill?: { email?: string } };
type RazorpayResult = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
declare global { interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, callback: (error: { description?: string }) => void) => void } } }

export default function SignupPaymentPage() {
  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [paid, setPaid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    paymentApi.signupStatus().then((status) => {
      if (!alive) return;
      setPaid(status.paid);
      if (status.paid) setSession(null);
    }).catch((reason) => {
      if (alive) {
        const message = reason instanceof Error ? reason.message : "Please sign in again to continue.";
        setError(message);
        if (/token|unauthorized|401|access/i.test(message)) navigate("/login", { replace: true });
      }
    }).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [navigate]);

  const startPayment = async () => {
    setBusy(true); setError("");
    try {
      const account = await authApi.me();
      const checkout = await paymentApi.signupCheckout() as CheckoutData;
      if (checkout.paid) { setPaid(true); setSession(null); return; }
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Could not load the secure payment window. Check your connection and retry."));
          document.body.appendChild(script);
        });
      }
      if (!window.Razorpay) throw new Error("Secure checkout is unavailable. Please retry.");
      const checkoutWindow = new window.Razorpay({
        key: checkout.keyId, amount: checkout.amount, currency: checkout.currency,
        name: checkout.name, description: checkout.description, order_id: checkout.orderId,
        prefill: { email: account.email || checkout.prefill?.email },
        theme: { color: "#d6a84f" },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (result: RazorpayResult) => {
          try {
            await paymentApi.verify(result.razorpay_order_id, result.razorpay_payment_id, result.razorpay_signature);
            setPaid(true); setSession(null);
          } catch (reason) { setError(reason instanceof Error ? reason.message : "We could not confirm this payment. Retry or contact support."); }
          finally { setBusy(false); }
        },
      });
      checkoutWindow.on("payment.failed", (failure) => { setError(failure.description || "Payment failed. Please try again."); setBusy(false); });
      checkoutWindow.open();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not start payment.");
      setBusy(false);
    }
  };

  return <main className="mx-auto flex min-h-[65vh] max-w-xl items-center px-4 py-12">
    <section className="w-full rounded-xl border border-line bg-white p-6 text-center shadow-sm sm:p-9">
      {loading ? <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-navy-700" /> : paid ? <>
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h1 className="mt-4 text-2xl font-black text-navy-900">Joining fee paid</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Your one-time ₹2 account fee is confirmed. Your profile is now awaiting administrator approval. Business listings are free once your account is approved.</p>
        <button onClick={() => navigate("/login?mode=signin", { replace: true })} className="mt-6 rounded-md bg-navy-800 px-5 py-3 text-sm font-bold text-white">Continue to sign in</button>
      </> : <>
        <CreditCard className="mx-auto h-10 w-10 text-navy-700" />
        <h1 className="mt-4 text-2xl font-black text-navy-900">Complete your account signup</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Pay the one-time ₹2 joining fee to submit your account for administrator approval. You won’t be charged again for creating or publishing business listings.</p>
        {user?.email && <p className="mt-3 text-xs text-slate-500">Account: {user.email}</p>}
        {error && <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-left text-sm text-red-700">{error}</p>}
        <button disabled={busy} onClick={() => void startPayment()} className="mt-6 inline-flex items-center gap-2 rounded-md bg-gold-500 px-6 py-3 text-sm font-bold text-navy-900 disabled:opacity-60">{busy && <LoaderCircle className="h-4 w-4 animate-spin" />}{busy ? "Processing…" : "Pay ₹2 securely"}</button>
      </>}
    </section>
  </main>;
}
