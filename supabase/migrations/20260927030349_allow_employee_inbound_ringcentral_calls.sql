-- Employees may read only their own inbound RingCentral events for CRM screen-pop.
drop policy if exists ringcentral_calls_employee_inbound_select on public.ringcentral_call_records;
create policy ringcentral_calls_employee_inbound_select
on public.ringcentral_call_records
for select
to authenticated
using (
  direction = 'Inbound'
  and lower(coalesce(employee_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
);