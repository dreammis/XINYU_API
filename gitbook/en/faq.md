# Frequently asked questions

## Are these original provider model IDs?

The documentation lists public product route names. Names do not guarantee original-provider access or a precise model snapshot. Check the [model center](models.md) and capability guide for actual limits.

## Why do I receive 401 or 403?

Check your customer API Key, model permissions and account restrictions. A console management token is not a generation key. See [authentication](authentication.md).

## Are playground requests billed?

Yes. The playground calls the real customer API and normal generation billing applies. See [billing](billing.md) for query, failure and refund rules. The key is only used on the current page and is not persisted.

## Can I retry immediately after a timeout?

A timeout or disconnect does not prove the backend stopped. Check the original task and consumption records before resubmitting to avoid duplicate generation and billing. See [task recovery](errors.md).

## Does HTTP 200 or a task ID mean generation succeeded?

Image streams require a completion event. After video creation, poll until `completed`, then download the file. Status responses are not file downloads.

## Where are speech and music APIs?

The API navigation lists capabilities with published contracts. Unpublished series are marked on the overview and will appear in their own section after delivery.
