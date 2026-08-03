-- Migration: Sync invoice payment status to transactions table
-- Purpose: Auto-sync status_pembayaran changes from invoices to transactions
--          to prevent "Tandai Lunas" showing stale "Belum Lunas" in TransactionHistory
--
-- Background: Wholesale invoices (invoices table) have parallel records in the
-- transactions table (linked by invoice_number). TransactionHistory reads from
-- transactions_list_view which is based on transactions table. Without this
-- trigger, code paths that update invoices.status_pembayaran WITHOUT also
-- updating transactions.status_pembayaran will cause inconsistency.

CREATE OR REPLACE FUNCTION public.sync_invoice_to_transactions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status_pembayaran IS DISTINCT FROM OLD.status_pembayaran THEN
    UPDATE public.transactions
    SET
      status_pembayaran = NEW.status_pembayaran,
      bayar = CASE
        WHEN NEW.status_pembayaran = 'Lunas' THEN
          COALESCE(bayar, 0) + COALESCE(sisa_hutang, 0)
        ELSE bayar
      END,
      sisa_hutang = CASE
        WHEN NEW.status_pembayaran = 'Lunas' THEN 0
        ELSE sisa_hutang
      END
    WHERE invoice_number = NEW.invoice_number;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_invoice_payment ON public.invoices;

CREATE TRIGGER trigger_sync_invoice_payment
AFTER UPDATE OF status_pembayaran ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.sync_invoice_to_transactions();
