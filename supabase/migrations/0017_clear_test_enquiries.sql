-- One-off cleanup: removes the two test enquiries placed while verifying
-- the submit-enquiry pipeline end-to-end.
delete from enquiries
where contact_name in ('Test Organiser', 'Verify Test');
