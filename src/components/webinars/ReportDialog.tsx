'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';
import { apiPost, errorMessage, fieldError } from '@/lib/api';
import { REPORT_REASON_LABELS, reportReasonsFor } from '@/lib/constants';
import type { ReportReason, ReportTarget } from '@/lib/types';

export function ReportDialog({
  open,
  onClose,
  onSuccess,
  targetType,
  targetId,
  targetName,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  targetType: ReportTarget;
  targetId: string;
  targetName: string;
}) {
  const reasons = reportReasonsFor(targetType);
  const [reason, setReason] = useState<ReportReason>(reasons[0]!);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [field, setField] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      setReason(reasons[0]!);
      setDetails('');
      setError('');
      setField(undefined);
      setBusy(false);
    }
  }, [open, reasons]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setField(undefined);
    try {
      const result = await apiPost<{ id: string; message: string }>('/reports', {
        targetType,
        targetId,
        reason,
        details: details.trim() || undefined,
      });
      onSuccess(result.message);
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
      setField(fieldError(caught, 'details'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Надіслати скаргу"
      description={`Скарга на ${targetType === 'WEBINAR' ? 'захід' : 'користувача'} «${targetName}». Адміністратор перегляне її найближчим часом.`}
      size="md"
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>Скасувати</button>
          <button type="submit" form="report-form" className="btn btn--danger" disabled={busy}>
            {busy ? 'Надсилаємо…' : 'Надіслати скаргу'}
          </button>
        </>
      }
    >
      <form id="report-form" onSubmit={submit} noValidate>
        <fieldset className="report-reasons">
          <legend className="form__label">Причина скарги</legend>
          {reasons.map((item) => (
            <label key={item} className={`report-reason ${reason === item ? 'is-selected' : ''}`}>
              <input
                type="radio"
                name="reason"
                value={item}
                checked={reason === item}
                onChange={() => setReason(item)}
              />
              <span>{REPORT_REASON_LABELS[item]}</span>
              {reason === item ? <Icon name="i-check" size={16} /> : null}
            </label>
          ))}
        </fieldset>

        <div className="form__group">
          <label className="form__label" htmlFor="report-details">Коментар <span className="form__hint">(необов’язково)</span></label>
          <textarea
            className={`form__control form__control--textarea ${field ? 'is-invalid' : ''}`}
            id="report-details"
            name="details"
            rows={4}
            maxLength={500}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="Опишіть, що саме порушує правила спільноти"
            aria-invalid={Boolean(field)}
          />
          <div className="form__meta">
            {field ? <p className="form__error">{field}</p> : <span />}
            <span>{details.length}/500</span>
          </div>
        </div>

        {error ? <p className="form__alert" role="alert">{error}</p> : null}
      </form>
    </Modal>
  );
}
