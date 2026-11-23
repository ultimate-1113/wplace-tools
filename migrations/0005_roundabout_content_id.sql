-- First 96 bits of SHA-256("listed:" + the original .wplace source).
UPDATE templates SET id='irJkh26b4BwCLtlQ', listed=1
WHERE id='official-roundabout' AND official=1;
UPDATE template_requests SET template_id='irJkh26b4BwCLtlQ'
WHERE template_id='official-roundabout';
