package types

type KHSDetailResponse struct {
	Status  bool   `json:"status"`
	Message string `json:"message"`
	Html    string `json:"html"`
}

type KHSItem struct {
	No            string   `json:"no"`
	Class         string   `json:"class"`
	Course        string   `json:"course"`
	Lecturers     []string `json:"lecturers"`
	CourseType    string   `json:"course_type"`
	Credits       string   `json:"credits"`
	Score         string   `json:"score"`
	Grade         string   `json:"grade"`
	Weight        string   `json:"weight"`
	WeightedScore string   `json:"weighted_score"`
}

type KRSItem struct {
	Semester   string   `json:"semester"`
	Course     string   `json:"course"`
	Class      string   `json:"class"`
	Curriculum string   `json:"curriculum"`
	Credits    string   `json:"credits"`
	CourseType string   `json:"course_type"` // Wajib / Pilihan (WP)
	QuotaNow   string   `json:"quota_now"`
	QuotaMax   string   `json:"quota_max"`
	Schedule   string   `json:"schedule"`
	Lecturers  []string `json:"lecturers"`
}
