<?php
//Composer 依赖
require '../vendor/autoload.php';
use QL\QueryList;

$html = file_get_contents('https://ncov.dxy.cn/ncovh5/view/pneumonia');
$data = QueryList::html($html)->rules([
	'name' => ['#getAreaStat','text']
])->query()->getData();
$fetchData = $data->all();
$fetchData[0] = substr($fetchData[0]['name'],27,strlen($fetchData[0]['name']) - 38);
$dataArray = json_decode($fetchData[0],'UTF-8');
$countArray = array(
	'total_confirmed' => (int)0,
	'total_death' => (int)0,
	'total_cured' => (int)0,
	'provinces_data' => [],
	'cities_data' => []
);
foreach ($dataArray as $data) {
	$countArray['total_confirmed'] += (int)$data['confirmedCount'];
	$countArray['total_death'] += (int)$data['deadCount'];
	$countArray['total_cured'] += (int)$data['curedCount'];

	$countArray['provinces_data'][$data['provinceName']]['provinceName'] = (string)$data['provinceName'];
	$countArray['provinces_data'][$data['provinceName']]['confirmed'] = (int)$data['confirmedCount'];
	$countArray['provinces_data'][$data['provinceName']]['death'] = (int)$data['deadCount'];
	$countArray['provinces_data'][$data['provinceName']]['cured'] = (int)$data['curedCount'];
	$countArray['provinces_data'][$data['provinceName']]['citiesName'] = array();
	
	foreach ($data['cities'] as $citiesData) {
		$countArray['provinces_data'][$data['provinceName']]['citiesName'][] = $citiesData['cityName'];
	}

	foreach ($data['cities'] as $cityData) {
		$countArray['cities_data'][$cityData['cityName']]['cityName'] = (string)$cityData['cityName'];
		$countArray['cities_data'][$cityData['cityName']]['confirmed'] = (int)$cityData['confirmedCount'];
		$countArray['cities_data'][$cityData['cityName']]['death'] = (int)$cityData['deadCount'];
		$countArray['cities_data'][$cityData['cityName']]['cured'] = (int)$cityData['curedCount'];
	}
}
header('Access-Control-Allow-Origin: *');
echo json_encode($countArray);
?>