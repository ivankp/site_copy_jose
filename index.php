<?php
function get($var, $default=null) { return isset($var) ? $var : $default; }

$menu = json_decode(file_get_contents('menu.json'),true);
$pages = $menu['pages'];
$this_page = get($_GET['page'],$menu['top'][0]);
function get_prop($prop,$default=null) {
  global $pages, $this_page;
  return get($pages[$this_page][$prop],$default);
}

$forward = get_prop('forward');
if ($forward) {
  $url = $forward[0];
  if ($forward[1])
    $url .= '?'.http_build_query(array_merge($_GET,$forward[1]));
  header('Location: '.$url);
  exit;
}

$page_base = preg_split('~/(?=[^/]*$)~',get_prop('page',$this_page));
$dir0 = 'pages';
$dir = $dir0;
if (count($page_base)==1) $page_base = $page_base[0];
else {
  $dir = $dir.'/'.$page_base[0];
  $page_base = $page_base[1];
}
$page_base_len = strlen($page_base);
$page_file = null;
$page_is_txt = false;
foreach (scandir($dir) as $f) {
  if (strncmp($f,$page_base,$page_base_len)) continue;
  $ext = substr($f,$page_base_len);
  if ($ext=='.php' || $ext=='.html') {
    $page_file = $dir.'/'.$page_base.$ext; break;
  }
  if (!$ext) {
    if (!is_dir($dir.'/'.$page_base)) continue;
    $dir = $dir.'/'.$page_base;
    foreach (scandir($dir) as $f) {
      if (strncmp($f,$page_base,$page_base_len)) continue;
      $ext2 = substr($f,$page_base_len);
      if ($ext2=='.php' || $ext2=='.html') {
        $page_file = $dir.'/'.$page_base.$ext2; break;
      }
    }
    break;
  }
  if ($ext=='.txt') {
    $page_is_txt = true;
    $page_file = $dir.'/'.$page_base.'.txt'; break;
  }
}
?>
<!DOCTYPE HTML>
<html lang="en-US">
<head>
<title><?php echo get_prop('title',get_prop('name',$this_page)); ?></title>

<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">

<?php
function link_css($css) {
  echo '<link rel="stylesheet" href="'.$css.'" type="text/css">'."\n";
}
link_css('styles.css');
if (array_key_exists($this_page,$pages)) {
  foreach ($pages[$this_page]['css'] as $css) link_css($css);
}
if ($dir!='pages') {
  $css = $dir.'/styles.css';
  if (file_exists($css)) link_css($css);
}

if ($page_file) { ?>
<script>
const page = "<?php echo $this_page;?>";
const dir = "<?php echo $dir;?>";
</script>
<?php }
?>

<body>

<div id="nav">
<ul>
<?php
function make_menu($page, $x) {
  global $this_page, $pages;
  echo '<li';
  if ($page === $this_page) echo ' class="current-menu-item"';
  echo '>';
  $text = get($x['name'],$page);
  if ($x['icon']) {
    $text = '<img src="img/icons/'.$x['icon'].'" alt="">'.$text;
  }
  if ($x['link']) {
    echo '<a href="'.$x['link'].'"';
    if ($x['_blank']) echo ' target="_blank"';
    echo '>'.$text.'</a>';
  } else if ($x['page'] !== false) {
    echo '<a href="?page='.$page;
    foreach ($x['args'] as $arg)
      echo '&'.$arg[0].'='.$arg[1];
    echo '">'.$text.'</a>';
  } else echo '<p>'.$text.'</p>';
  if (array_key_exists('sub',$x)) {
    echo "\n<ul>";
    foreach ($x['sub'] as $sub) make_menu($sub,$pages[$sub]);
    echo "</ul>\n";
  }
  echo "</li>\n";
}
foreach ($menu['top'] as $page) make_menu($page,$pages[$page]);
?>
</ul>
</div>

<div id="main"<?php
if ($page_is_txt)
  echo ' style="white-space: pre-wrap; font-family:monospace;"';
?>>
<?php
if ($page_file) include $page_file;
else { ?>
<p style="color:red;font-weight:bold;">
Page '<?php echo $this_page; ?>' not found!
</p>
<?php } ?>
</div>

<?php
$is_mobile = preg_match(
  "/(android|avantgo|blackberry|bolt|boost|cricket|docomo|fone|hiptop|mini".
  "|mobi|palm|phone|pie|tablet|up\.browser|up\.link|webos|wos)/i",
  $_SERVER["HTTP_USER_AGENT"]);

if (!$is_mobile) { ?>
<div id="date"> Last updated:
<?php
  $date_of = ($dir!=$dir0) ? $dir : $page_file;
  echo $date_of ? date("F d Y H:i",filemtime($date_of)) : '?';
?>
</div>
<?php } ?>

</body>
</html>
