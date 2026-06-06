export function formatAddress(rawAddress) {
  if (!rawAddress) return "";
  let parts = rawAddress
    .split(/\s*,\s*|\s*،\s*/g)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return "";

  parts = parts.filter((p) => {
    if (/^(iran|ایران)$/i.test(p)) return false;
    if (/province|استان/gi.test(p)) return false;
    return true;
  });

  parts = parts.map((p) =>
    p
      .replace(/Street/gi, "خیابان")
      .replace(/St\./gi, "خیابان")
      .replace(/Boulevard|Blvd/gi, "بلوار")
      .replace(/Road/gi, "جاده")
      .replace(/Alley/gi, "کوچه")
      .replace(/Square/gi, "میدان")
      .replace(/No\.?/gi, "پلاک")
      .trim()
  );

  const cityRegex = new RegExp(
    [
      "تهران","مشهد","اصفهان","شیراز","تبریز","کرج","قم","اهواز","رشت",
      "ارومیه","کرمان","یزد","زاهدان","بوشهر","گرگان","ساری","قزوین",
      "زنجان","همدان","سنندج","خرم‌آباد","بندرعباس","ایلام","بیرجند",
      "اراک","کاشان","بابل",
    ].join("|"),
    "i"
  );

  let cityIndex = parts.findIndex((p) => cityRegex.test(p));
  if (cityIndex !== -1) {
    const beforeCity = parts.slice(0, cityIndex);
    const fromCity = parts.slice(cityIndex);
    const finalParts = [...fromCity, ...beforeCity];
    return finalParts.join("، ");
  }
  return parts.join("، ");
}
