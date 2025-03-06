const { DateTime } = require("luxon");

function source_d({ src, options }) {
  const input = src[options];

  // Проверка наличия временной зоны в строке
  const hasTimeZone = /(\+|\-)\d{2}:\d{2}$/.test(input);

  // Попытка парсинга даты
  let date = hasTimeZone
    ? DateTime.fromISO(input, { zone: undefined })
    : DateTime.fromISO(input, { zone: "utc" });

  //Не распарсилось
  if (!date.isValid) {
    const format = DateTime.buildFormatParser("yyyy-MM-ddZZ");

    date = DateTime.fromFormatParser(input, format, {
      zone: hasTimeZone ? undefined : "utc",
    });
  }

  if (!date.isValid) {
    date = parseCustomFormats(input, hasTimeZone);
  }

  return date.isValid ? date.toISO() : null;
}

/**
 * Парсинг даты с использованием пользовательских форматов
 * @param {string} input - Входная строка с датой
 * @param {boolean} hasTimeZone - Флаг наличия временной зоны
 * @returns {DateTime} - Распарсенная дата
 */
function parseCustomFormats(input, hasTimeZone) {
  const variants = [
    {
      fullDate:
        /(?<day>\d{2})(?:-|\/|\.)(?<month>\d{2})(?:-|\/|\.)(?<year>\d{4})/,
      time: /\d{2}:\d{2}/,
      format: "yyyy-MM-dd HH:mm",
    },
    {
      fullDate:
        /(?<year>\d{4})(?:-|\/|\.)(?<month>\d{2})(?:-|\/|\.)(?<day>\d{2})/,
      time: /\d{2}:\d{2}/,
      format: "yyyy-MM-dd HH:mm",
    },
    {
      fullDate: /\D?(?<day>\d{1,2})\D? (?<month>[а-яА-Я]+)\.? (?<year>\d{4})/,
      time: /\d{2}:\d{2}/,
      locale: "ru",
      format: "yyyy-MM-dd HH:mm",
      getMonthNum: (month) => russianMonth.get(month),
    },
  ];

  const russianMonth = new Map([
    ["января", "01"],
    ["февраля", "02"],
    ["марта", "03"],
    ["апреля", "04"],
    ["мая", "05"],
    ["июня", "06"],
    ["июля", "07"],
    ["августа", "08"],
    ["сентября", "09"],
    ["октября", "10"],
    ["ноября", "11"],
    ["декабря", "12"],
    ["янв", "01"],
    ["фев", "02"],
    ["мар", "03"],
    ["апр", "04"],
    ["май", "05"],
    ["июн", "06"],
    ["июл", "07"],
    ["авг", "08"],
    ["сен", "09"],
    ["окт", "10"],
    ["ноя", "11"],
    ["дек", "12"],
  ]);

  for (const variant of variants) {
    const fullDateMatch = variant.fullDate.exec(input);
    const timeMatch = variant.time.exec(input);

    if (!fullDateMatch) continue;

    // Преобразование месяца для русских дат
    if (variant.getMonthNum) {
      fullDateMatch.groups.month = variant.getMonthNum(
        fullDateMatch.groups.month
      );
    }

    const prettyDate = `${fullDateMatch.groups.year}-${
      fullDateMatch.groups.month
    }-${
      fullDateMatch.groups.day.length === 1
        ? "0" + fullDateMatch.groups.day
        : fullDateMatch.groups.day
    } ${timeMatch?.[0] ?? "00:00"}`;

    const parsedDate = DateTime.fromFormat(prettyDate, variant.format, {
      zone: hasTimeZone ? undefined : "utc",
      locale: variant.locale ?? "en",
    });

    if (parsedDate.isValid) return parsedDate;
  }

  return DateTime.invalid("Формат даты не распознан");
}

module.exports = source_d;

// Пример использования
const src = {
  date01: "2018-06-01T18:17:12.745+07:00",
  date02: "2018-06-01T18:17:12.745Z",
  date03: "2018-06-01T18:17:12",
  date04: "2018-06-01T18:17:12.745",
  date05: "2018-06-01+07:00",
  date06: "2018-06-01",
  date07: "www.ru; 12-03-2018 года 11:00 часов",
  date08: "2018-05-17 года в 15:00 (по местному времени).",
  date09: "www.ru; 12.03.2018 года 11:00 часов",
  date10: "2018.05.17 года в 15:00 (по местному времени).",
  date11: "www.ru; 12-03-2018 года",
  date12: "2018-05-17 года",
  date13: "www.ru; 12.03.2018 года",
  date14: "2018.05.17 года",
  date15: "1 января 2017 года",
  date16: "11 августа 2018 года",
  date17: "02 дек. 2018 года",
  date18: '"02" ноя. 2018 года',
  date19: "«02» сен. 2018 года",
  date20: "27/03/2018 г. в 10:00 (по московскому времени)",
};

const result = source_d({ src, options: "date05" });
console.log(result); // Вывод: "2018-06-01T00:00:00.000+07:00"
