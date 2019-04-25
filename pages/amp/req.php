<?php
$proc = proc_open(
  './req.py',
  array(0 => array('pipe','r'), 1 => array('pipe','w'), 2 => array('pipe','w')),
  $pipes
);
if (is_resource($proc)) {
  fwrite($pipes[0],json_encode($_POST));
  fclose($pipes[0]);
  echo stream_get_contents($pipes[1]);
  fclose($pipes[1]);
  echo stream_get_contents($pipes[2]);
  fclose($pipes[2]);
  proc_close($proc);
}
?>


