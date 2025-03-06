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
